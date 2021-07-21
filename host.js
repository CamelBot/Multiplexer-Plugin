const clientJs = require('./client');
const { EventEmitter } = require('events');

/**@type {Map} */
let clients;

module.exports = class host extends EventEmitter {
    /**
     * 
     * @param {Object} manifest 
     * @param {import('../../camelLib')} camellib 
     * @param {Array<String>} multiplexedMessages
     */
    constructor(manifest, camellib, multiplexedMessages) {
        super();
        this.channel = camellib.client.channels.cache.get(manifest.channel);
        console.log('Creating new multihost on ' + this.channel.id);
        this.clients = new Map();
        clients = this.clients;
        this.client = camellib.client;
        this.destroyed = false;
        this.manifest = manifest;
        this.camellib = camellib;
        this.multiplexedMessages = multiplexedMessages;
        manifest.clients.forEach(element => {
            this.createClient(element);
        });

        camellib.client.on('messageCreate', async message => {
            this.discordMessage(message);
        });
        camellib.on('minecraftChatSent', (message, sender, channelid) => {
            if (channelid != this.channel.id) return;
            this.clients.forEach(cl => {
                cl.sendMessage(this.cleanMessage(message), sender);
            });
        });
        camellib.on('minecraftEventSent', (message, channelid) => {
            if (channelid != this.channel.id) return;
            this.clients.forEach(cl => {
                cl.sendMessage(this.cleanMessage('**' + message + '**'), camellib.client.user.username);
            });
        });
    }

    /**
     * @type {import('discord.js').Channel}
     */
    channel;
    /**
     * @type {Map<Number,clientJs>}
     */
    clients;
    lastSender;
    /**@type {import('discord.js').Client} */
    client;
    multiplexedMessages;
    destroyed;
    manifest;
    /**@type {import('../../camelLib')} */
    camellib;
    /**
     * 
     * @param {String} channelid 
     */
    createClient(channelid) {
        let theClient = new clientJs(this.camellib, channelid, this.multiplexedMessages);
        clients.set(channelid, theClient);
        this.clients.set(channelid, theClient);
        theClient.on('message', message => {
            if (this.destroyed) return;
            this.clientMessage(message.content, message.author.username, message.channel.id);
            this.camellib.emit('multiplexerMessage', message.content, message.author.username, this.channel.id);
        });
        theClient.on('extmessage', (message, sender, channelId) => {
            if (this.destroyed) return;
            this.clientMessage(message, sender, channelId);
        });
    }


    clientMessage(message, sender, sourceChannelId) {
        if (this.lastSender == sender) {
            this.channel.send(this.cleanMessage(message));
            this.clients.forEach(cl => {
                if (cl.channel.id == sourceChannelId) return;
                cl.sendMessage(this.cleanMessage(message), sender);
            });
        } else {
            this.channel.send('__**' + sender + '**__\n' + this.cleanMessage(message));
            this.clients.forEach(cl => {
                if (cl.channel.id == sourceChannelId) return;
                cl.sendMessage(this.cleanMessage(message), sender);
            });
            this.lastSender = sender;
        }
    }

    /**@param {import('discord.js').Message} message */
    discordMessage(message) {
        if (this.destroyed) return;
        if (message.channel.id != this.channel.id) return;
        if (message.content.length < 1) return;
        if (message.author.id == this.client.user.id) return;
        this.clients.forEach(cl => {
            cl.sendMessage(this.cleanMessage(message.content), message.author.username);
        });
        this.lastSender = undefined;

    }

    cleanMessage(message) {
        /**@type {String} */
        let toSend = message;
        toSend = toSend.replaceAll('@everyone', '@.everyone');
        toSend = toSend.replaceAll('@here', '@.here');
        let toSendSplit = toSend.split(' ');
        for (let i = 0; i < toSendSplit.length; i++) {

            if (toSendSplit[i].startsWith('<@!') && toSendSplit[i].endsWith('>')) {
                if (this.client.users.cache.has(toSendSplit[i].replace('<@!', '').replace('>', ''))) {
                    toSendSplit[i] = '@' + this.client.users.cache.get(toSendSplit[i].replace('<@!', '').replace('>', '')).username;
                }
            }
        }
        return (toSendSplit.join(' '));
    }

    selfDestruct() {
        // If the host's services are no longer required, we must destroy this object
        // JavaScript does not have a built in method to destroy 
        // The listeners will stay unless we do something about
        clients.forEach(element => {
            element.selfDestruct();
            element.removeListener('message', message => {
                if (this.destroyed) return;
                this.clientMessage(message);
            });
        });
        this.client.removeListener('message', async message => {
            this.discordMessage(message);
        });
        this.destroyed = true;
    }

    removeClient(channelid) {
        if (clients.has(channelid)) {
            this.clients.get(channelid).selfDestruct();
            this.manifest.clients.splice(this.manifest.clients.indexOf(channelid));
        }
    }
};