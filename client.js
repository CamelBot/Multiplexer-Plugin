const Discord = require('discord.js')
const { EventEmitter } = require('events');


module.exports = class host extends EventEmitter {
    /**
     * 
     * @param {Object} manifest 
     * @param {Discord.Client} client 
     */
    constructor(client,channelid,multiplexedMessages){
        super();
        this.channel = client.channels.cache.get(channelid);
        this.multiplexedMessages = multiplexedMessages;
        client.on('message',message=>{
            if(message.channel!=this.channel.id) return;
            if(message.content.length<1) return;
            if(message.author.id==client.user.id){
                setTimeout(function(){
                    if(multiplexedMessages.includes(message.id)) return;
                    this.emit('message',(message))
                }, 100);
            }else{
                this.emit('message',(message))
                this.lastSender = undefined;
            }
            
            
        })
    }

    /**@type {Discord.Channel} */
    channel
    /**@type {String} */
    lastSender
    /**@type {Array<String>} */
    multiplexedMessages;
    /**
     * 
     * @param {String} message 
     * @param {String} sender 
     */
    sendMessage(message,sender){
        if(this.lastSender == sender){
            this.channel.send(message).then(msg=>{
                this.multiplexedMessages.push(msg.id);
                if(this.multiplexedMessages.length>500){
                    this.multiplexedMessages.shift();
                }
            });
        }else{
            this.channel.send("__**"+sender+"**__\n"+message).then(msg=>{
                this.multiplexedMessages.push(msg.id);
                if(this.multiplexedMessages.length>500){
                    this.multiplexedMessages.shift();
                }
            });
            this.lastSender = sender;
        }
    }
    

}