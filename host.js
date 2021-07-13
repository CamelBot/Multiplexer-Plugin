const clientJs = require('./client');
const { EventEmitter } = require('events');

/**@type {Map} */
let clients;
module.exports = class host extends EventEmitter {
    /**
     * 
     * @param {Object} manifest 
     * @param {import('discord.js').Client} client 
     * @param {Array<String>} multiplexedMessages
     */
    constructor(manifest, client, multiplexedMessages) {
        super();
        this.channel = client.channels.cache.get(manifest.channel);
        this.clients = new Map();
        clients = this.clients;
        this.client = client;
        this.destroyed = false;
        this.manifest = manifest;
        this.multiplexedMessages = multiplexedMessages;
        manifest.clients.forEach(element => {
            this.createClient(element);
        });

        client.on('message', async message => {
            this.discordMessage(message);
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

    /**
     * 
     * @param {String} channelid 
     */
    createClient(channelid) {
        let theClient = new clientJs(this.client, channelid, this.multiplexedMessages);
        clients.set(channelid, theClient);
        this.clients.set(channelid, theClient);
        theClient.on('message', message => {
            if (this.destroyed) return;
            this.clientMessage(message);
        });
    }

    /**@param {import('discord.js').Message} message */
    clientMessage(message) {
        if (this.lastSender == message.author.username) {
            this.channel.send(this.cleanMessage(message.content)).then(msg => {
                this.multiplexedMessages.push(msg.id);
                if (this.multiplexedMessages.length > 500) {
                    this.multiplexedMessages.shift();
                }
            });
        } else {
            this.channel.send('__**' + message.author.username + '**__\n' + this.cleanMessage(message.content)).then(msg => {
                this.multiplexedMessages.push(msg.id);
                if (this.multiplexedMessages.length > 500) {
                    this.multiplexedMessages.shift();
                }
            });
            this.lastSender = message.author.username;
        }
    }

    /**@param {import('discord.js').Message} message */
    discordMessage(message) {
        if (this.destroyed) return;
        if (message.channel.id != this.channel.id) return;
        if (message.content.length < 1) return;
        if (message.author.id == this.client.user.id) {
            let that = this;
            setTimeout(function () {
                if (that.multiplexedMessages.includes(message.id)) return;
                clients.forEach(cl => {
                    cl.sendMessage(that.cleanMessage(message.content), message.author.username);
                });
            }, 100);
        } else {
            if (this.multiplexedMessages.includes(message.id)) return;
            this.clients.forEach(cl => {
                cl.sendMessage(this.cleanMessage(message.content), message.author.username);
            });
            this.lastSender = undefined;
        }
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