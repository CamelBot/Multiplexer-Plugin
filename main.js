const { EventEmitter } = require('events');
const { resolve } = require('path');
const fs = require('fs');
const commandRunner = require('../../commandRunner');
const mcCommandRunner = require('../minecraft/mcCommandRunner');
const camelLibjs = require('../../camelLib');
const host = require('./host');
let logger;
/**@type {camelLibjs}  */
let camellib;

module.exports = class plugin extends EventEmitter {
    constructor(parameters){
        super();
        this.multihosts = []
        logger = parameters.logger;
        camellib = parameters.camellib
        this.multiplexedMessages = [];
        camellib.on('pluginEnabled', (guildid, plugname)=>{
            if(plugname!='multiplexer') return;
            camellib.database.get(guildid)['multiplexer']={
                "host":[],
                "join":[]
            }
            camellib.saveDatabase();
        });
        camellib.on('pluginDisabled', (guildid, plugname)=>{
            if(plugname!='multiplexer') return;
            camellib.database.get(guildid).multiplexer.host = [];
            camellib.database.get(guildid).multiplexer.join = [];
            camellib.saveDatabase();
        });
        
        camellib.once('pluginsLoaded',()=>{
            camellib.database.forEach(guild=>{
                if(guild.hasOwnProperty("multiplexer")){
                    guild.multiplexer.host.forEach(element=>{
                        this.multihosts.push(new host(element,camellib.client,guild.id,this.multiplexedMessages));
                    });
                }
            });
            camellib.client.on('channelDelete',channel=>{
            
            });
        });
        
    }   
    /**
     * 
     * @param {commandRunner|mcCommandRunner} commandRunner
     */
    multihost(commandRunner){
        if(!commandRunner.interaction.member.permissions.has('ADMINISTRATOR')){
            let toSend = new Discord.MessageEmbed()
                .setColor("#FF0000")
                .setTitle("Error")
                .addField("Permission","You do not have administrator permission to host channels here")
            commandRunner.interaction.reply({embeds:[toSend],ephemeral:true});
            return;
        }

    }

    multihosts

    /**
     * @type {Array<String>}
     */
    multiplexedMessages;

}
