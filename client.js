const { EventEmitter } = require('events');


module.exports = class host extends EventEmitter {
    /**
     * 
     * @param {Object} manifest 
     * @param {import('discord.js').Client} client 
     */
    constructor(client, channelid, multiplexedMessages) {
        super();
        this.channel = client.channels.cache.get(channelid);
        this.destroyed = false;
        this.multiplexedMessages = multiplexedMessages;
        client.on('message', message => {
            if (this.destroyed) return;
            if (message.channel != this.channel.id) return;
            if (message.content.length < 1) return;
            let that = this;
            if (message.author.id == client.user.id) {
                setTimeout(function () {
                    if (multiplexedMessages.includes(message.id)) return;
                    that.emit('message', (message));
                }, 100);
            } else {
                this.emit('message', (message));
                this.lastSender = undefined;
            }


        });
    }

    /**@type {import('discord.js').Channel} */
    channel
    /**@type {String} */
    lastSender
    /**@type {Array<String>} */
    multiplexedMessages;
    destroyed;
    /**
     * 
     * @param {String} message 
     * @param {String} sender 
     */
    sendMessage(message, sender) {
        if (this.destroyed) return;
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