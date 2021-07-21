const { EventEmitter } = require('events');


module.exports = class host extends EventEmitter {
    /**
     * 
     * @param {Object} manifest 
     * @param {import('../../camelLib')} camellib 
     */
    constructor(camellib, channelid, multiplexedMessages) {
        super();
        this.channel = camellib.client.channels.cache.get(channelid);
        console.log('Client instantiated on channel ' + this.channel.id);
        this.destroyed = false;
        this.multiplexedMessages = multiplexedMessages;
        this.camellib = camellib;
        camellib.client.on('messageCreate', message => {
            if (this.destroyed) return;
            if (message.channel != this.channel.id) return;
            if (message.content.length < 1) return;
            if (message.author.id == camellib.client.user.id) {
                //this.lastSender = undefined;
                return;
            }
            this.emit('message', (message));
            this.lastSender = undefined;


        });
        camellib.on('minecraftChatSent', (message, sender, channelid) => {
            if (channelid != this.channel.id) return;
            this.emit('extmessage', (message, sender, this.channel.id));
        });
        camellib.on('minecraftEventSent', (message, channelid) => {
            if (channelid != this.channel.id) return;
            this.emit('extmessage', (message, undefined, this.channel.id));
        });
    }

    /**@type {import('discord.js').Channel} */
    channel
    /**@type {String} */
    lastSender
    /**@type {Array<String>} */
    multiplexedMessages;
    destroyed;
    camellib;
    /**
     * 
     * @param {String} message 
     * @param {String} sender 
     */
    sendMessage(message, sender) {
        if (this.destroyed) return;
        this.camellib.emit('multiplexerMessage', message, sender, this.channel.id);
        if (this.lastSender == sender) {
            this.channel.send(message).then(msg => {
                this.multiplexedMessages.push(msg.id);
                if (this.multiplexedMessages.length > 500) {
                    this.multiplexedMessages.shift();
                }
            });
        } else {
            this.channel.send('__**' + sender + '**__\n' + message).then(msg => {
                this.multiplexedMessages.push(msg.id);
                if (this.multiplexedMessages.length > 500) {
                    this.multiplexedMessages.shift();
                }
            });
            this.lastSender = sender;
        }
    }

    selfDestruct() {
        // For some reason remove listener doesn't work so this garbage workaround will be fine for now
        this.destroyed = true;
    }


};