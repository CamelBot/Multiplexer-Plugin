const Discord = require('discord.js')
const clientJs = require('./client')
const { EventEmitter } = require('events');

let clients
module.exports = class host extends EventEmitter {
    /**
     * 
     * @param {Object} manifest 
     * @param {Discord.Client} client 
     * @param {Array<String>} multiplexedMessages
     */
    constructor(manifest,client,guildid,multiplexedMessages){
        super();
        this.channel=client.channels.cache.get(manifest.channel);
        this.clients = new Map();
        this.client = client
        manifest.clients.forEach(element => {
            let theClient = new clientJs(client,element,multiplexedMessages);
            this.clients.set(element,theClient);
            clients = this.clients;
            theClient.on('message',tmsg=>{
                /**@type {Discord.Message} */
                let message = tmsg;
                if(this.lastSender==message.author.username){
                    this.channel.send(this.cleanMessage(message.content)).then(msg=>{
                        multiplexedMessages.push(msg.id);
                        if(multiplexedMessages.length>500){
                            multiplexedMessages.shift();
                        }
                    });
                }else{
                    this.channel.send("__**"+message.author.username+"**__\n"+this.cleanMessage(message.content)).then(msg=>{
                        multiplexedMessages.push(msg.id);
                        if(multiplexedMessages.length>500){
                            multiplexedMessages.shift();
                        }
                    });
                    this.lastSender = message.author.username;
                }
            })
        });
        
        client.on('message',async message=>{
            if(message.channel.id!=this.channel.id) return;
            if(message.content.length<1) return;
            if(message.author.id==client.user.id){
                let that = this;
                setTimeout(function(){
                    if(multiplexedMessages.includes(message.id)) return;
                    clients.forEach(cl=>{
                        cl.sendMessage(that.cleanMessage(message.content),message.author.username);
                    })
                }, 100);
            }else{
                if(multiplexedMessages.includes(message.id)) return;
                this.clients.forEach(cl=>{
                    cl.sendMessage(this.cleanMessage(message.content),message.author.username);
                })
                this.lastSender = undefined;
            }
            
            
        })
    }

    /**
     * @type {Discord.Channel}
     */
    channel;
    /**
     * @type {Map<Number,clientJs>}
     */
    clients;
    lastSender;
    /**@type {Discord.Client} */
    client;

    cleanMessage(message){
        /**@type {String} */
        let toSend = message;
        toSend = toSend.replaceAll("@everyone","@.everyone");
        toSend = toSend.replaceAll("@here","@.here");
        let toSendSplit = toSend.split(' ');
        for(let i = 0; i<toSendSplit.length; i++){
            
            if(toSendSplit[i].startsWith("<@!")&&toSendSplit[i].endsWith(">")){
                if(this.client.users.cache.has(toSendSplit[i].replace("<@!","").replace(">",""))){
                    toSendSplit[i] = "@"+this.client.users.cache.get(toSendSplit[i].replace("<@!","").replace(">","")).username;
                }
            }
        }
        return(toSendSplit.join(' '));
    }
}