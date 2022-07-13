let APP_ID= "35235354f3294d698be952a4853164a5"

let token=null;
let uid= String(Math.floor(Math.random()*10000))

let client;
let channel;



let queryString =window.location.search
let urlParams= new URLSearchParams(queryString);
let roomID= urlParams.get('room')

if(!roomID) {
    window.location='lobby.html'
}



let localStream;
let remoteStream
let peerConnection;

const servers= {
    iceServers:[
        {
            urls:['stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']
        }
    ]
}


let constraints = {
    video:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080},
    },
    audio:true
}

let init =async () => {
  client = await AgoraRTM.createInstance(APP_ID)
  await client.login({uid,token})
  channel=client.createChannel(roomID)
  await channel.join()
  channel.on("MemberJoined", handleuserJoined)
  channel.on('MemberLeft',handleUserLeft)
  client.on('MessageFromPeer',handleMessageFromPeer)
  localStream =await navigator.mediaDevices.getUserMedia(constraints)
  document.getElementById('user-1').srcObject = localStream
}

let handleUserLeft = () => {
    document.getElementById('user-2').style.display ='none';
    document.getElementById('user-1').classList.remove('smallFrame')

}

let handleMessageFromPeer = async (message,MemberID) => {
  message=JSON.parse(message.text)
  console.log('Message', message)
  if(message.type==='offer') {
    createAnswer(MemberID, message.offer)
  }
  if(message.type==='answer') {
    addAnswer(message.answer)
  }
  if (message.type==='candiate') {
    if(peerConnection) {
        peerConnection.addIceCandidate(message.candiate)
    }
  }

}
let handleuserJoined = async (MemeberID)=> {
    console.log(`A new user has Joined:`,MemeberID)
    createOffer(MemeberID)
}

let createPeerConnection=async (MemberID)=> {
    peerConnection = new RTCPeerConnection(servers)

    remoteStream = new MediaStream()
    document.getElementById('user-2').srcObject=remoteStream
    document.getElementById('user-2').style.display='block'
    document.getElementById('user-1').classList.add('smallFrame')

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true})
        document.getElementById('user-1').srcObject=localStream;
    }


    localStream.getTracks().forEach((track)=>{
        peerConnection.addTrack(track,localStream)
    })
    peerConnection.ontrack = (event)=>{
        event.streams[0].getTracks().forEach((track)=>{
            remoteStream.addTrack(track)
        })
    }
    peerConnection.onicecandidate= async (event) =>{
        if(event.candidate){
            client.sendMessageToPeer({text:JSON.stringify({'type':'candiate','candiate':event.candidate})},MemberID)
        }
    }

}

let createOffer= async (MemberID) => {
    await createPeerConnection(MemberID)

    let offer= await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    console.log('Offer: '+ offer)
    client.sendMessageToPeer({text:JSON.stringify({'type':'offer','offer':offer})},MemberID)
}


let createAnswer =async (MemberID,offer)=>{
    await createPeerConnection(MemberID)

    await peerConnection.setRemoteDescription(offer)

    let answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    client.sendMessageToPeer({text:JSON.stringify({'type':'answer','answer':answer})},MemberID)
    
}


let addAnswer =async (answer) => {
    if (!peerConnection.currentRemoteDescription) {
        peerConnection.setRemoteDescription(answer)
    }
}



let leaveChannel = async () => {
    await channel.leave()
    await channel.logout()

}

let ToggleCamera=async()=> {
    let VideoTrack= localStream.getTracks().find(track => track.kind === 'video')

    if (VideoTrack.enabled) {
        VideoTrack.enabled=false
        document.getElementById('camera-btn').style.backgroundColor ='rgb(255,80,80)'
    }
    else {
        VideoTrack.enabled=true
        document.getElementById('camera-btn').style.backgroundColor='rgb(179,102,249,0.9)'
    }
}

let ToggleMic=async()=> {
    let AudioTrack= localStream.getTracks().find(track => track.kind === 'audio')

    if (AudioTrack.enabled) {
        AudioTrack.enabled=false
        document.getElementById('mic-btn').style.backgroundColor ='rgb(255,80,80)'
    }
    else {
        AudioTrack.enabled=TextTrackCueList
        document.getElementById('mic-btn').style.backgroundColor='rgb(179,102,249,0.9)'
    }
}


window.addEventListener('beforeunload',leaveChannel)

document.getElementById('camera-btn').addEventListener('click', ToggleCamera)

document.getElementById('mic-btn').addEventListener('click', ToggleMic)


init()