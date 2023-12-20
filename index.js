const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const mime = require('mime-types');
const { executionAsyncResource } = require('async_hooks');
const port = process.env.PORT || 8000;
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

function delay(t, v) {
  return new Promise(function(resolve) { 
      setTimeout(resolve.bind(null, v), t)
  });
}

app.use(express.json());
app.use(express.urlencoded({
extended: true
}));
app.use(fileUpload({
debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});

const client = new Client({
  //authStrategy: new LocalAuth({ clientId: 'bot-zdg' }),
  authStrategy: new LocalAuth({ clientId: 'bot-whatsapp' }),
  puppeteer: { headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

client.initialize();

io.on('connection', function(socket) {
  socket.emit('message', 'Iniciado');
  socket.emit('qr', './icon.svg');

client.on('qr', (qr) => {
    console.log('QR RECEBIDO', qr);
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'QRCode recebido, aponte a câmera  seu celular!');
    });
});

client.on('ready', () => {
    socket.emit('ready', 'Dispositivo pronto!');
    socket.emit('message', 'Dispositivo pronto!');
    socket.emit('qr', './check.svg')	
    console.log('Dispositivo pronto');
});

client.on('authenticated', () => {
    socket.emit('authenticated', 'Autenticado!');
    socket.emit('message', 'Autenticado!');
    console.log('Autenticado');
});

client.on('auth_failure', function() {
    socket.emit('message', 'Falha na autenticação, reiniciando...');
    console.error('Falha na autenticação');
});

client.on('change_state', state => {
  console.log('Status de conexão: ', state );
});

client.on('disconnected', (reason) => {
  socket.emit('message', 'Cliente desconectado!');
  console.log('Cliente desconectado', reason);
  client.initialize();
});
});

// Send message
app.post('/zdg-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const message = req.body.message;

  if (numberDDI !== "55") {
    const numberWhatsapp = number + "@c.us";
    client.sendMessage(numberWhatsapp, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberWhatsapp = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberWhatsapp, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberWhatsapp = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberWhatsapp, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
});


// Send media
app.post('/zdg-media', [
  body('number').notEmpty(),
  body('caption').notEmpty(),
  body('file').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number;
  const numberDDI = number.substr(0, 2);
  const numberDDD = number.substr(2, 2);
  const numberUser = number.substr(-8, 8);
  const caption = req.body.caption;
  const fileUrl = req.body.file;

  let mimetype;
  const attachment = await axios.get(fileUrl, {
    responseType: 'arraybuffer'
  }).then(response => {
    mimetype = response.headers['content-type'];
    return response.data.toString('base64');
  });

  const media = new MessageMedia(mimetype, attachment, 'Media');

  if (numberDDI !== "55") {
    const numberWhatsapp = number + "@c.us";
    client.sendMessage(numberWhatsapp, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Imagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) <= 30) {
    const numberWhatsapp = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberWhatsapp, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Imagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDI === "55" && parseInt(numberDDD) > 30) {
    const numberWhatsapp = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberWhatsapp, media, {caption: caption}).then(response => {
    res.status(200).json({
      status: true,
      message: 'Imagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: ' Imagem não enviada',
      response: err.text
    });
    });
  }

});

const mensagemBoasVindasEnviada = new Set();
const estadoUsuario = new Map();
const estadoSubmenu = new Map();
var mensagemUsuario = [];
function opcoesRedeminas(escolha, numeroRemetente, estadoAtual){
  escolha = Number(escolha);
  var escolhaPrograma = (escolha - 1);
  if(estadoAtual === "submenu_redeminas"){
    var programas = ["Jornal Minas","Meio de Campo","Opnião Minas","Palavra Cruzada","Agenda","Auto Falante","Brasil das Gerais","Harmonia","Hypershow","Mais Geraes"];
  }else if(estadoAtual === "submenu_inconfidencia"){
    var programas = ["Memória Nacional","Acorde","Jornal da Inconfidência","Música e Notícia","Estúdio 100,9","MPB Em Revista","Bazar Maravilha","Almanaque","Jornal da Inconfidência","Zona de Conforto"];
  }else if(estadoAtual === "submenu_emc"){
    var programas = ["EMCPlay"];
  }else if(estadoAtual === "submenu_seliga"){
    var programas = ["Tira dúvidas ensino fundamental","Tira dúvidas ensino médio"];
  }
  client.sendMessage(numeroRemetente, "Você escolheu a opção " + escolha + " - " + programas[escolhaPrograma]);
  client.sendMessage(numeroRemetente, "1. Mandar Mensagem para o programa");
  client.sendMessage(numeroRemetente, "0. Sair para o menu anterior");
  estadoUsuario.set(numeroRemetente, 'submenu_mensagem');
  
}

client.on('message', async (msg) => {
  if (msg.from.includes("@g.us")) {
    return null;
  }

  const numeroRemetente = msg.from;
  console.log(msg.from);
  let estadoAtual = estadoUsuario.get(numeroRemetente);
  let estadoOpcao = estadoSubmenu.get(numeroRemetente);


  // NUMEROS
  var meiocampo = "553194552841@c.us";
  // Array que armazena os números que receberão os dados digitados pelo telespectador
  var numerosProgramas = ["553199120881@c.us"];

  // SUBMENU que contem os programas
  if ((estadoAtual === 'submenu_redeminas') || (estadoAtual === 'submenu_inconfidencia') || (estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')) {
    switch (msg.body) {
      case '1':
        // Submenu para a opção 1 do submenu
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;

      case '2':
        // Submenu para a opção 2 do submenu
        if(estadoAtual === 'submenu_emc'){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;
      
      case '3':
        // Submenu para a opção 3 do submenu
        if((estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;
    
      case '4':
        // Submenu para a opção 4 do submenu
        if((estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;
      
      case '5':
        // Submenu para a opção 5 do submenu
        if((estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;
  
      case '6':
        // Submenu para a opção 6 do submenu
        if((estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;
    
      case '7':
        // Submenu para a opção 7 do submenu
        if((estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;
      
      case '8':
        // Submenu para a opção 8 do submenu
        if((estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;
  
      case '9':
        // Submenu para a opção 9 do submenu
        if((estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;
      
      case '10':
        // Submenu para a opção 10 do submenu
        if((estadoAtual === 'submenu_emc') || (estadoAtual === 'submenu_seliga')){
          client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
          break;
        }
        opcoesRedeminas(msg.body, numeroRemetente, estadoAtual);
        break;

      case '0':
        // Sair do submenu para o menu principal
        client.sendMessage(numeroRemetente, "Você escolheu sair do submenu. Voltando para o menu principal.\r\nOlá! Sou o Robens, seu assistente virtual da Empresa Mineira de Comunicação - EMC 🤖\r\n\r\nPara começar, me informe por favor sobre qual canal gostaria de falar:\r\n\r\n1 - Rede Minas\r\n2 - Rádio Inconfidência\r\n3 - EMCPlay\r\n4 - Se liga na Educação");
        estadoUsuario.set(numeroRemetente, null);
        break;

      default:
        client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
    }
  }else if (estadoAtual === 'submenu_mensagem') {
    
    if(estadoOpcao === 'aguardandoMensagem'){
      // Perguntar ao usuário a Mensagem
      client.sendMessage(numeroRemetente, "Digite a mensagem que você deseja enviar:");
      estadoUsuario.set(numeroRemetente, 'aguardandoMensagem');
      estadoSubmenu.set(numeroRemetente, '');
      mensagemUsuario[2] = msg.body;
    }else if(estadoOpcao === 'aguardandoEndereco'){
      // Perguntar ao usuário o Endereço
      client.sendMessage(numeroRemetente, "Digite o seu endereço(Rua, Bairro, Cidade):");
      estadoSubmenu.set(numeroRemetente, 'aguardandoMensagem');
      mensagemUsuario[1] = msg.body;
    }else if(estadoOpcao === 'aguardandoIdade'){
      // Perguntar ao usuário a Idade
      client.sendMessage(numeroRemetente, "Digite a sua idade:");
      estadoSubmenu.set(numeroRemetente, 'aguardandoEndereco');
      mensagemUsuario[0] = msg.body;
    }else if(msg.body == '1'){
      // Perguntar ao usuário o Nome
      client.sendMessage(numeroRemetente, "Você escolheu a opção 1 - Mandar mensagem para o programa");
      client.sendMessage(numeroRemetente, "Digite o seu nome:");
      estadoSubmenu.set(numeroRemetente, 'aguardandoIdade');
    }else if(msg.body == '0'){
      client.sendMessage(numeroRemetente, "Você escolheu sair para o menu anterior.");
      estadoUsuario.set(numeroRemetente, 'submenu_redeminas');
    }else{
      client.sendMessage(numeroRemetente, "Opção inválida no submenu. Por favor, escolha novamente.");
    }

  }else if(estadoAtual === 'aguardandoMensagem'){
    const imagemJoinha = MessageMedia.fromFilePath('./joinha.jpg');
    client.sendMessage(numeroRemetente, 'Mensagem Enviada ao programa!\nAgradecemos sua participação!\nVoltando para o Menu inicial!');
    client.sendMessage(numeroRemetente, imagemJoinha);
    //teste mensagem enviada pelo usuário
    mensagemUsuario[3] = msg.body;
    console.log(mensagemUsuario);
    //Envia a mensagem para o programa
    for(var x = 0; x < mensagemUsuario.length; x++){
      client.sendMessage(numerosProgramas[0], mensagemUsuario[x]);
      console.log(mensagemUsuario[x]);
    }
    estadoUsuario.set(numeroRemetente, '');
  }else{
    const numeroEscolhido = parseInt(msg.body);
    if (!isNaN(numeroEscolhido) && numeroEscolhido >= 1 && numeroEscolhido <= 4) {
      switch (numeroEscolhido) {
        case 1:
          client.sendMessage(numeroRemetente, "Você quer falar sobre a Rede Minas, escolha um de nossos programas.\r\nDigite o número da opção que deseja.\r\n\r\n1 - Jornal Minas\r\n2 - Meio de Campo\r\n3 - Opinião Minas\r\n4 - Palavra Cruzada\r\n5 - Agenda\r\n6 - Auto Falante\r\n7 - Brasil das Gerais\r\n8 - Harmonia\r\n9 - Hypershow\r\n10 - Mais Geraes\r\n0 - Para voltar para o menu anterior");
          estadoUsuario.set(numeroRemetente, 'submenu_redeminas');
          break;
        
        case 2:
          client.sendMessage(numeroRemetente, "Você quer falar sobre a Rádio Inconfidencia, escolha um de nossos programas.\r\nDigite o número da opção que deseja.\r\n\r\n1 - Memória Nacional\r\n2 - Acorde\r\n3 - Jornal da Inconfidência\r\n4 - Música e Notícia\r\n5 - Estúdio 100,9\r\n6 - MPB Em Revista\r\n7 - Bazar Maravilha\r\n8 - Almanaque\r\n9 - Jornal da Inconfidência\r\n10 - Zona de Conforto\r\n0 - Para voltar para o menu anterior");
          estadoUsuario.set(numeroRemetente, 'submenu_inconfidencia');
          break;

        case 3:
          client.sendMessage(numeroRemetente, "Você quer falar sobre a EMC, escolha um de nossos programas.\r\nDigite o número da opção que deseja.\r\n\r\n1 - EMCPlay\r\n0 - Para voltar para o menu anterior");
          estadoUsuario.set(numeroRemetente, 'submenu_emc');
          break;

        case 4:
          client.sendMessage(numeroRemetente, "Você quer falar sobre o Se Liga na Educação, escolha uma das opções a seguir.\r\nDigite o número da opção que deseja.\r\n\r\n1 - Tira dúvidas ensino fundamental\r\n2 - Tira dúvidas ensino médio\r\n0 - Para voltar para o menu anterior");
          estadoUsuario.set(numeroRemetente, 'submenu_seliga');
          break;

        case 0:
          client.sendMessage(numeroRemetente, "Você já está no menu inicial, digite uma opção correta!");
          break;

        default:
          client.sendMessage(numeroRemetente, "Opção inválida. Por favor, escolha novamente.");
        
      }
    }else{
      client.sendMessage(numeroRemetente, "Olá! Sou o Robens, seu assistente virtual da Empresa Mineira de Comunicação - EMC 🤖\r\n\r\nPara começar, me informe por favor sobre qual canal gostaria de falar:\r\n\r\n1 - Rede Minas\r\n2 - Rádio Inconfidência\r\n3 - EMCPlay\r\n4 - Se liga na Educação");
    }
  }
});

server.listen(port, function () {
  console.log('Aplicação rodando na porta *: ' + port + ' . Acesse no link: http://localhost:' + port);
});

