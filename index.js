const Discord = require('discord.js');
const {
    CommandManager
} = require('krobotjs');

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

// Create a command group
commands.group().prefix("#").apply(_ => {
    commands
        .command("test <message> <nb:^[0-9]+$> [opt]", (message, args) => message.reply('test')).register()
        .sub("moche", (message, args) => message.reply('t es moche')).register();
    commands
        .command("lol <message>", (message, args) => message.reply('lol')).register()
        .sub("test", (message, args) => message.reply('lol test')).register();
    commands
        .command("test2 <message>", (message, args) => message.reply(args.get('message'))).register()
        .sub("moche", (message, args) => message.reply('t es moche 2')).register();
});

// The regexp can only validate the syntax.

bot.on('message', message => {
    main(message);
});

bot.on('messageUpdate', (oldMessage, message) => {
    main(message);
});

function main(message) {
    // If the message is a command, then it will be executed and will return "true"
    // yet, if there is no command, it will return "false"
    if (!commands.dispatch(message)) {
        let channel = message.channel;
        if (channel.name === 'liens') {
            // Execute action related to links
            link(message);
        }
    }
}

const linkFormatRegexp = /^ ?\[((?:\*\*)?)([^*]+?)\1\] ?([\w\W]+https?:\/\/[\w\W]*)/i;

function link(message) {
    console.log(message.content);
    console.log('New message in #liens, checking for formatting errors');
    let matches = message.content.match(linkFormatRegexp) || [];
    if (matches.length === 0) {
        console.log('Message incorectly formatted. Deleting');
        message.delete();
        console.log('Sending deleted message to its author');
        message.author.send('Le lien que vous avez envoyé dans #liens est mal formatté !');
        message.author.send('Pour rappel, vous devez utiliser la syntaxe: `[**Catégorie**] Description, contenant au mimimum un lien');
        message.author.send('Voici le message que vous avez envoyé :');
        message.author.sendCode('markdown', message.content);
    } else {
        console.log('Message is correctly formatted ! Yay !');
        console.log('Category:', matches[2]);
        console.log('Description:', matches[3]);
    }
}

bot.on('ready', _ => console.log('Connected'));
bot.on('reconnecting', _ => console.log('Reconnecting'));
bot.on('error', error => console.error(error));

bot.login(process.env.DISCORD_TOKEN);
