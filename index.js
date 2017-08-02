/*eslint indent: ["error", 4, { "SwitchCase": 1 }]*/
const Discord = require('discord.js');
const request = require('request');
const birthdays = require('./lib/birthdays.js');
const CronJob = require('cron').CronJob;
const client = new Discord.Client();
const prefix = '!';

client.on('message', message => {
    main(message);
});

client.on('messageUpdate', (oldMessage, message) => {
    main(message);
});


/**
 * Bot logic
 *
 * @param {Discord.Message} message received message
 */
function main(message) {
    /* @type {Discord.TextChannel} */
    const channel = message.channel;
    if (channel.name === 'liens' || channel.name === 'liens-non-dev') {
        // Execute action related to links
        link(message);
        return;
    }
    if (message.content.indexOf(prefix) !== 0) return;
    console.log(message.content);
    const command = message.content.split(' ')[0].substring(1);
    const args = message.content.split(' ').slice(1);
    switch (command) {
        case 'ping':
            message.reply('pong !');
            break;
        case 'g':
            message.delete();
            message.channel.send(args[0] + ', http://lmgtfy.com/?q=' +
                encodeURIComponent(args.slice(1).join(' ')).replace(/%20/g, '+'));
            break;
        case 'help':
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
                .setTitle('Ping')
                .setColor([22, 117, 207])
                .addField('Utilisation: ', '!ping')
            );
            break;
        case 'deltaw':
            message.channel.send('<:delta1:336963749875417088><:delta2:336963752622686210>\n' +
                '<:delta3:336963752991916042><:delta4:336963753096773632>');
            message.delete();
            break;
        case 'delta':
            message.channel.send('<:delta0:336966048525975553><:delta1:336966048991543296>\n' +
                '<:delta2:336966048953794571><:delta3:336966049343864834>');
            message.delete();
            break;
        case 'dermen':
            message.channel.send('<:dermen0:336975016602107906><:dermen1:336975017374121985>\n' +
                '<:dermen2:336975019244650527><:dermen3:336975019378737155>\n' +
                '<:dermen4:336975020372787200><:dermen5:336975020947406849>\n' +
                '<:dermen6:336975021224493056><:dermen7:336975021656375301>');
            message.delete();
            break;
        case 'straw':
            let title = '';
            let choices = [];
            if(message.content.indexOf('"') === -1) {
                title = args[0];
                choices = args.slice(1).join(' ').split('/');
            } else {
                console.log('Contains quote');
                title = args.join(' ').split('"')[1];
                choices = args.join(' ').split(title).join('').replace('"', '').replace('"', '').split('/');
            }
            createPoll(title, choices, false, message)
            break;
        case 'forcebd':
            if(!client.guilds.find('name', 'Salon des développeurs').members.find('id', message.author.id).roles.exists('name', 'Administrateur')) break;
            sendMessageIfBirthday();
            break;
        default:
            break;
    }
}

// The regexp validates the syntax and extracts the data
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
    let channel = client.guilds.find('name', 'Salon des développeurs').channels.find('name', 'annonces');
    birthdays.getTodaysBirthdays(bds => {
        bds.map(row =>
            channel.send(':birthday: Bon anniversaire à ' + mention(row[0]) + ', qui fête ses ' + row[2] + ' ans aujourd\'hui ! :birthday:')
        );
    });
}

function mention(searchPattern) {
    let matching = client.guilds.first().members
        .map(elem => elem.user)
        .filter(user => user.username.indexOf(searchPattern) >= 0)
        .map(user => user.id);
    return matching.length === 1 ? `<@${matching[0]}>` : searchPattern;
}

new CronJob('1 0  * * *', function() {
    sendMessageIfBirthday();
}, null, true, 'Europe/Paris');

client.on('ready', _ => {
    client.user.setStatus('online', {
        name: 'salondesdevs.io/discord',
        url: 'https://salondesdevs.io/discord',
        type: 1
    });
    console.log('Connected');
});
client.on('reconnecting', _ => console.log('Reconnecting'));
client.on('error', error => console.error(error));

client.login(process.env.DISCORD_TOKEN);
