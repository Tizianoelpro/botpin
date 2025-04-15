import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, SlashCommandBuilder, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const ADMIN_PIN = process.env.ADMIN_PIN;
const PIN_LENGTH = ADMIN_PIN.length;

client.commands = new Collection();
client.commands.set('admin', {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Verificate como admin usando el PIN.'),
  async execute(interaction) {
    let inputPin = '';
    const userId = interaction.user.id;

    const embed = new EmbedBuilder()
      .setColor('Blue')
      .setTitle('🔐 Verificación de seguridad')
      .setDescription('Presioná los números para ingresar tu PIN.');

    const createButtons = () => {
      const rows = [];
      for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 1; j <= 3; j++) {
          const num = 3 * i + j;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`pin_${num}`)
              .setLabel(`${num}`)
              .setStyle(ButtonStyle.Secondary)
          );
        }
        rows.push(row);
      }
      const lastRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId('pin_0').setLabel('0').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('pin_clear').setLabel('🗑️').setStyle(ButtonStyle.Danger)
        );
      rows.push(lastRow);
      return rows;
    };

    const msg = await interaction.reply({
      embeds: [embed],
      components: createButtons(),
      ephemeral: true,
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
      time: 60000,
      filter: i => i.user.id === userId
    });

    collector.on('collect', async i => {
      const id = i.customId;

      if (id === 'exit_admin') {
        inputPin = '';
        await i.update({
          embeds: [embed],
          components: createButtons()
        });
        return;
      }

      if (id === 'pin_clear') {
        inputPin = '';
      } else {
        const digit = id.split('_')[1];
        if (inputPin.length < PIN_LENGTH) {
          inputPin += digit;
        }
      }

      if (inputPin.length === PIN_LENGTH) {
        collector.stop('done');
        if (inputPin === ADMIN_PIN) {
          await i.update({
            embeds: [new EmbedBuilder()
              .setColor('Green')
              .setTitle('✅ Acceso concedido')
              .setDescription('Estás en modo admin.')],
            components: [
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId('exit_admin')
                  .setLabel('🔓 Salir del modo admin')
                  .setStyle(ButtonStyle.Secondary)
              )
            ]
          });
        } else {
          await i.update({
            embeds: [new EmbedBuilder().setColor('Red').setTitle('❌ PIN incorrecto')],
            components: []
          });
        }
      } else {
        await i.update({
          embeds: [new EmbedBuilder()
            .setColor('Blue')
            .setTitle('🔐 Verificación de seguridad')
            .setDescription(`PIN ingresado: \`${'*'.repeat(inputPin.length)}\``)],
          components: createButtons()
        });
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason !== 'done') {
        await msg.edit({
          embeds: [new EmbedBuilder().setColor('Grey').setTitle('⏱️ Tiempo expirado')],
          components: []
        });
      }
    });
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (command) {
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: 'Error al ejecutar el comando.', ephemeral: true });
    }
  }
});

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
