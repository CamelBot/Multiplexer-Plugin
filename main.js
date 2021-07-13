const Discord = require('discord.js');
const { EventEmitter } = require('events');
const host = require('./host');
/**@type {import('../../camelLib')}  */
let camellib;
/**@type {Array<host>} */
let multihosts = [];
module.exports = class plugin extends EventEmitter {
    constructor(parameters) {
        super();
        camellib = parameters.camellib;
        this.multiplexedMessages = [];
        this.multihosts = multihosts;
        camellib.on('pluginEnabled', (guildid, plugname) => {
            if (plugname != 'multiplexer') return;
            camellib.database.get(guildid)['multiplexer'] = {
                'host': [],
                'join': []
            };
            camellib.saveDatabase();
        });
        camellib.on('pluginDisabled', (guildid, plugname) => {
            if (plugname != 'multiplexer') return;
            camellib.database.get(guildid).multiplexer.host = [];
            camellib.database.get(guildid).multiplexer.join = [];
            camellib.saveDatabase();
        });

        camellib.once('pluginsLoaded', () => {
            camellib.database.forEach(guild => {
                if (Object.prototype.hasOwnProperty.call(guild, 'multiplexer')) {
                    guild.multiplexer.host.forEach(element => {
                        multihosts.push(new host(element, camellib.client, this.multiplexedMessages));
                    });
                }
            });
            camellib.client.on('channelDelete', () => {

            });


            camellib.client.on('interactionCreate', leInteraction => {
                if (!leInteraction.isButton) return;
                /**@type {Discord.ButtonInteraction} */
                let interaction = leInteraction; // this is why we can't have nice things
                let buttonJson;
                try {
                    buttonJson = JSON.parse(interaction.customId);
                } catch {
                    return;
                }
                if (buttonJson.command == 'multijoin') {
                    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                        let toSend = new Discord.MessageEmbed()
                            .setColor('#FF0000')
                            .setTitle('Error')
                            .addField('Permission', 'You do not have administrator permission to host channels here');
                        interaction.reply({ embeds: [toSend], ephemeral: true });
                        return;
                    }
                    if (buttonJson.allow) {
                        camellib.database.get(interaction.guild.id).multiplexer.host.forEach(leHost => {
                            if (leHost.channel == interaction.channel.id) {
                                leHost.clients.push(buttonJson.client);
                            }
                        });
                        camellib.database.get(buttonJson.guild).multiplexer.join.push({
                            'channel': buttonJson.client,
                            'host': interaction.channel.id
                        });
                        camellib.saveDatabase();
                        multihosts.forEach(leHost => {
                            if (leHost.channel.id == interaction.channel.id) {
                                leHost.createClient(buttonJson.client);
                            }
                        });
                        interaction.message.delete();
                        let toSend = new Discord.MessageEmbed()
                            .setColor('#008000')
                            .setTitle('Welcome')
                            .addField('Success', 'The host has added you to their multiplexer');
                        camellib.client.channels.cache.get(buttonJson.client).send({ embeds: [toSend] });
                    } else {
                        interaction.message.delete();
                        let toSend = new Discord.MessageEmbed()
                            .setColor('#FF0000')
                            .setTitle('Denied')
                            .addField('Error', 'The host has denied you from their multiplexer');
                        camellib.client.channels.cache.get(buttonJson.client).send({ embeds: [toSend] });
                    }
                }

            });
        });

    }
    /**
     * @type {Array<host>}
     */
    multihosts;

    /**
     * @type {Array<String>}
     */
    multiplexedMessages;

    /**
     * 
     * @param {import('../../commandRunner')} commandRunner
     */
    multihost(commandRunner) {
        // Check for permission
        if (!commandRunner.interaction.member.permissions.has('ADMINISTRATOR')) {
            let toSend = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setTitle('Error')
                .addField('Permission', 'You do not have administrator permission to host channels here');
            commandRunner.interaction.reply({ embeds: [toSend], ephemeral: true });
            return;
        }
        // Check to make sure this channel isn't listening or hosting yet
        let found = false;
        if (camellib.database.get(commandRunner.interaction.guild.id).multiplexer.join.includes(commandRunner.interaction.channel.id)) found = true;
        camellib.database.get(commandRunner.interaction.guild.id).multiplexer.host.forEach(element => {
            if (element.channel == commandRunner.interaction.channel.id) found = true;
        });
        if (found) {
            // stop
            let toSend = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setTitle('Error')
                .addField('Already in use', 'This channel is either hosting or already in a multiplexer.');
            commandRunner.interaction.reply({ embeds: [toSend] });
            return;
        }
        // Create object in database
        camellib.database.get(commandRunner.interaction.guild.id).multiplexer.host.push({
            'channel': commandRunner.interaction.channel.id,
            'clients': [],
        });
        // Create a new host object
        multihosts.push(new host({
            'channel': commandRunner.interaction.channel.id,
            'clients': []
        }, camellib.client, commandRunner.interaction.guild.id, this.multiplexedMessages));
        // Send success message with instructions on joining
        let toSend = new Discord.MessageEmbed()
            .setColor('#008000')
            .setTimestamp()
            .addField('Success', 'Your channel is now hosting a multiplexer. Join it with ``/multijoin ' + commandRunner.interaction.channel.id + '``.');
        commandRunner.interaction.reply({ embeds: [toSend] });
        // Pretty easy one
        camellib.saveDatabase();
        // :dab:
    }


    /**
     * 
     * @param {import('../../commandRunner')} commandRunner
     */
    multileave(commandRunner) {
        // Check for permission
        if (!commandRunner.interaction.member.permissions.has('ADMINISTRATOR')) {
            let toSend = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setTitle('Error')
                .addField('Permission', 'You do not have administrator permission to edit the multiplexer for your server');
            commandRunner.interaction.reply({ embeds: [toSend], ephemeral: true });
            return;
        }
        // Check to make sure this channel is hosting or part of a multiplexer
        let found = false;
        // Check for clients listening to a host
        camellib.database.get(commandRunner.interaction.guild.id).multiplexer.join.forEach(element => {
            if (element.channel == commandRunner.interaction.channel.id) {
                found = true;
                camellib.database.get(commandRunner.interaction.guild.id).multiplexer.join.splice(camellib.database.get(commandRunner.interaction.guild.id).multiplexer.join.indexOf(commandRunner.interaction.channel.id));
                multihosts.forEach(element => {
                    element.removeClient(commandRunner.interaction.channel.id);
                });
                camellib.database.get(commandRunner.interaction.guild.id).multiplexer.join.splice(camellib.database.get(commandRunner.interaction.guild.id).multiplexer.join.indexOf(element));
                let toSend = new Discord.MessageEmbed()
                    .setColor('#008000')
                    .setTimestamp()
                    .addField('Success', 'You have disconnected from the multiplexer. You will no longer recieve or send messages.');
                commandRunner.interaction.reply({ embeds: [toSend] });
                return;
            }
        });

        // Check for hosts
        multihosts.forEach(element => {
            if (element.channel.id == commandRunner.interaction.channel.id) {
                found = true;
                element.selfDestruct();
                camellib.database.get(commandRunner.interaction.guild.id).multiplexer.host.forEach(dbhost => {
                    if (dbhost.channel == commandRunner.interaction.channel.id) {
                        camellib.database.get(commandRunner.interaction.guild.id).multiplexer.host.splice(camellib.database.get(commandRunner.interaction.guild.id).multiplexer.host.indexOf(dbhost));
                    }
                });
                camellib.database.forEach(guild => {
                    try {
                        guild.multiplexer.join.forEach(client => {
                            if (client.host == commandRunner.interaction.channel.id) {
                                guild.multiplexer.join.splice(guild.multiplexer.join.indexOf(client));
                            }
                        });
                    } catch {
                        // probably doesn't have the multiplexer object
                    }
                });
                let toSend = new Discord.MessageEmbed()
                    .setColor('#008000')
                    .setTimestamp()
                    .addField('Success', 'You have stopped hosting this multiplexer. All clients have been disconnected.');
                commandRunner.interaction.reply({ embeds: [toSend] });
                return;
            }

        });
        if (!found) {
            // stop
            let toSend = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setTitle('Error')
                .addField('Not multiplexing', 'This channel is not hosting or part of a multiplexer.');
            commandRunner.interaction.reply({ embeds: [toSend] });
            return;
        } else {
            camellib.saveDatabase();
        }
    }

    /**
     * 
     * @param {import('../../commandRunner')} commandRunner
     */
    multijoin(commandRunner) {
        if (!commandRunner.interaction.member.permissions.has('ADMINISTRATOR')) {
            let toSend = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setTitle('Error')
                .addField('Permission', 'You do not have administrator permission to edit the multiplexer for your server');
            commandRunner.interaction.reply({ embeds: [toSend], ephemeral: true });
            return;
        }
        let found = false;
        multihosts.forEach(multihost => {
            if (multihost.channel.id == commandRunner.interaction.options.get('channel').value) {
                found = true;
                let toSend = new Discord.MessageEmbed()
                    .setColor('#0000FF')
                    .setTitle('Multiplex Request')
                    .addFields(
                        {
                            name: 'Request', value: 'A client has requested to listen to this channel.', inline: false,
                        },
                        {
                            name: 'Server', value: commandRunner.interaction.guild.name
                        },
                        {
                            name: 'Channel', value: commandRunner.interaction.channel.name
                        },
                        {
                            name: 'User', value: commandRunner.interaction.member.user.username
                        }
                    )
                    .setThumbnail(commandRunner.interaction.guild.iconURL());
                let toButton = new Discord.MessageActionRow()
                    .addComponents(
                        new Discord.MessageButton()
                            .setCustomId(JSON.stringify({
                                'command': 'multijoin',
                                'client': commandRunner.interaction.channel.id,
                                'guild': commandRunner.interaction.guild.id,
                                'allow': true
                            }))
                            .setLabel('allow')
                            .setStyle('PRIMARY')
                    )
                    .addComponents(
                        new Discord.MessageButton()
                            .setCustomId(JSON.stringify({
                                'command': 'multijoin',
                                'client': commandRunner.interaction.channel.id,
                                'allow': false
                            }))
                            .setLabel('deny')
                            .setStyle('DANGER')
                    );
                multihost.channel.send({ embeds: [toSend], components: [toButton] });

                toSend = new Discord.MessageEmbed()
                    .setColor('#0000FF')
                    .setTitle('multijoin Command')
                    .addFields(
                        {
                            name: 'Request', value: 'A request has been sent to the host channel.', inline: false
                        }
                    );
                commandRunner.interaction.reply({ embeds: [toSend] });

            }
        });
        if (!found) {
            let toSend = new Discord.MessageEmbed()
                .setColor('#FF0000')
                .setTitle('Error')
                .addField('Not multiplexing', 'This channel is not hosting or part of a multiplexer.');
            commandRunner.interaction.reply({ embeds: [toSend] });
        }
    }








};
