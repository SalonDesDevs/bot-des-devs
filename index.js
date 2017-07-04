const Discord = require('discord.js');
const {CommandManager} = require('krobotjs');
const bot = new Discord.Client();
const commands = new CommandManager({
    parse: [{
        // Match user (<@ID>)
        match(message, arg) {
            return (/^<@((\d)+)>$/g).test(arg)
        },
        // Replace it with an instance of Discord.User(ID)
        async perform(message, arg) {
            const gmember = await message.channel.guild.fetchMember((/^<@((\d)+)>$/g).exec(arg)[1]);
            return gmember.user;
        }
    }]
});
const fs = require('fs');
const request = require('request');
const birthdays = require('./lib/birthdays.js');
const {CronJob} = require('cron');
let data = {};
loadData();

// Create a command group
commands.group().prefix('!').apply(_ => {
    commands.command('ping', message => message.reply('pong !')).register();
    let event = commands.command('event', _ => 0).register();
    event.sub('create <eventName> <startDate> <startTime> <endDate> <endTime>', (message, args) => {
        let startDate = args.get('startDate') + 'T' + args.get('startTime')
        let endDate = args.get('endDate') + 'T' + args.get('endTime')
        if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate))) {
            console.log('Wrong format for event creation');
            message.reply('Mauvais format de date. Vous devez utiliser le format AAAA-MM-JJ HH:MM')
            return;
        }
        data.events[args.get('eventName')] = {
            name: args.get('eventName'),
            begins: Date.parse(startDate),
            ends: Date.parse(endDate),
            members: []
        };
        console.log(data);
        message.reply('l\'évenement ' + args.get('eventName') + ' a été créé du ' +
            new Date(Date.parse(startDate)).toLocaleString() + ' au ' +
            new Date(Date.parse(endDate)).toLocaleString());
    }).register()
    event.sub('join <event>', (message, args) => {
        message.reply(args.get('event'));
    }).register();
    commands.command('g <tag> <message...>', (message, args) => {
        message.delete();
        message.channel.send(args.get('tag') + ', http://lmgtfy.com/?q=' +
            encodeURIComponent(args.get('message').join(' ')).replace(/%20/g, '+'))
    }
    ).register();
    commands.command('straw <title> <options...>',
        (message, args) => createPoll(args.get('title'), args.get('options').join(' ').split('/'), false, message)).register();
    commands.command('help', (message, args) => {
        message.channel.sendEmbed(new Discord.RichEmbed()
            .setTitle('LMGTFY')
            .setColor([22, 117, 207])
            .addField('Utilisation: ', '!g @Tag recherche')
            .addField('Exemple: ', '!g <@!302550798829748224> Pourquoi t\'es nul ?')
        );
        message.channel.sendEmbed(new Discord.RichEmbed()
            .setTitle('Strawpoll')
            .setColor([22, 117, 207])
            .addField('Utilisation: ', '!straw "Titre du strawpoll" Proposition 1/Proposition 2/Proposition 3/...')
            .addField('Exemple: ', '!straw "Que préferez-vous ?" Les pizza/Les hamburgers')
        );
        message.channel.sendEmbed(new Discord.RichEmbed()
            .setTitle('Event')
            .setColor([22, 117, 207])
            .addField('Créer un évenement: ', '!event create <nom de l\'event> <date de départ> <date de fin>')
            .addField('Créer un évenement par équipes: ',
                '!event create teams <minimum> <maximum> <nom de l\'event> <date de départ> <date de fin>')
            .addField('Rejoindre un évenement: ', '!event join <nom de l\'event>')
        );
        message.channel.sendEmbed(new Discord.RichEmbed()
            .setTitle('Équipes')
            .setColor([22, 117, 207])
            .addField('Créer une équipe: ', '!team create <nom de la team> <nom de l\'event>')
            .addField('Inviter dans une équipe: ', '!team invite <Pseudo>')
            .addField('Rejoindre une équipe:', '!team join <nom de la team>')
        );
        message.channel.sendEmbed(new Discord.RichEmbed()
            .setTitle('Ping')
            .setColor([22, 117, 207])
            .addField('Utilisation: ', '!ping')
        );
    }).register();
    commands.command('forecebd', _ => sendMessageIfBirthday()).register();
});

bot.on('message', message => {
    main(message);
});

bot.on('messageUpdate', (oldMessage, message) => {
    main(message);
});

function main(message) {
    // If the message is a command, then it will be executed and will return "true"
    // yet, if there is no command, it will return false
    if (!commands.dispatch(message)) {
        let channel = message.channel;
        if (channel.name === 'liens' || channel.name === 'liens-non-dev') {
            // Execute action related to links
            link(message);
        }
    }
}

// The regexp can only validate the syntax.
const linkFormatRegexp = /^ ?\[((?:\*\*)?)([^*]+?)\1\] ?([\w\W]+https?:\/\/[\w\W]*)/i;

function link(message) {
    console.log(message.content);
    console.log('New message in #liens, checking for formatting errors');
    let matches = message.content.match(linkFormatRegexp) || [];
    if (!matches.length) {
        console.log('Message incorrectly formatted. Deleting');
        message.delete();
        console.log('Sending deleted message to its author');
        message.author.send('Le lien que vous avez envoyé dans #liens est mal formatté !');
        message.author.send('Pour rappel, vous devez utiliser la syntaxe: `[**Catégorie**] Description, contenant au mimimum un lien`');
        message.author.send('Voici le message que vous avez envoyé :');
        message.author.sendCode('markdown', message.content);
    } else {
        console.log('Message is correctly formatted ! Yay !');
        console.log('Category:', matches[2]);
        console.log('Description:', matches[3]);
    }
}

function loadData() {
    fs.exists('data.js', exists => {
        if (exists) {
            // Read synchronously in order not to start the bot without having loaded the data file
            data = JSON.parse(fs.readFileSync('data.json'));
        } else {
            fs.writeFileSync('data.json', '{}');
        }
    });
    data.events = data.events || {}
    data.teams = data.teams || {};
}

function createPoll(title, options, multi, message) {
    const apiUri = 'https://www.strawpoll.me/api/v2/polls';
    request.post(apiUri, {
        headers: {
            'Content-Type': 'application/json'
        },
        json: {
            title,
            options,
            multi
        }
    }, (error, response, body) => {
        console.log(body)
        message.channel.send('https://www.strawpoll.me/' + body.id);
    });
}

function sendMessageIfBirthday() {
    let channel = bot.guilds.first().channels.find('name', 'annonces');
    birthdays.getTodaysBirthdays(bds => {
        bds.map(row =>
            channel.send(':birthday: Bon anniversaire à ' + mention(row[0]) + ', qui fête ses ' + row[2] + ' ans aujourd\'hui ! :birthday:')
        );
    })
}

function mention(searchPattern) {
    let matching = bot.guilds.first().members
        .map(elem => elem.user)
        .filter(user => user.username.indexOf(searchPattern) >= 0)
        .map(user => user.id);
    return matching.length === 1 ? `<@${matching[0]}>` : searchPattern;
}

new CronJob('1 0  * * *', function() {
  sendMessageIfBirthday();
}, null, true, 'Europe/Paris');

bot.on('ready', _ => console.log('Connected'));
bot.on('reconnecting', _ => console.log('Reconnecting'));
bot.on('error', error => console.error(error));

bot.login(process.env.DISCORD_TOKEN);
