import {AttackDetector} from './rhythm-engine.js';
import {detectPitch,pitchNote} from './pitch.js';

export class RhythmAudio {
  constructor({state,frame,attack,pitch}){Object.assign(this,{onState:state,onFrame:frame,onAttack:attack,onPitch:pitch});this.request=0;this.detector=new AttackDetector();this.clicks=new Set();this.voices=new Set();}
  async start(microphone=true,deviceId=''){
    this.stop();const request=this.request;
    if(!globalThis.AudioContext){this.onState('error','This trainer needs Web Audio in a modern browser.');return false;}
    this.onState('requesting','Allow microphone access, then get ready for four count-in beats.');
    let stream;
    try{
      const context=this.context=new AudioContext({latencyHint:'interactive'});await context.resume();
      if(request!==this.request)return false;
      if(microphone){
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone practice needs HTTPS or localhost.');
        stream=await navigator.mediaDevices.getUserMedia({audio:{...(deviceId?{deviceId:{exact:deviceId}}:{}),channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
        if(request!==this.request){stream.getTracks().forEach(t=>t.stop());return false;}
        this.stream=stream;
        const track=stream.getAudioTracks()[0];if(!track||track.readyState==='ended')throw new Error('No live microphone input.');
        track.addEventListener('ended',()=>{if(request===this.request){this.stop();this.onState('error','Microphone disconnected. Choose an input and start again.');}});
        this.source=context.createMediaStreamSource(stream);
        this.analyser=context.createAnalyser();this.analyser.fftSize=512;this.source.connect(this.analyser);
        this.pitchAnalyser=context.createAnalyser();this.pitchAnalyser.fftSize=4096;this.source.connect(this.pitchAnalyser);
        this.samples=new Float32Array(512);this.pitchSamples=new Float32Array(4096);
      }
      await context.resume();if(request!==this.request)return false;
      this.detector.reset();this.onState('ready');
      this.timer=setInterval(()=>{
        if(context.state!=='running'){this.stop();this.onState('error','Audio paused. Press Start to resume with a fresh count-in.');return;}
        let rms=0;
        if(this.analyser){
          this.analyser.getFloatTimeDomainData(this.samples);rms=Math.sqrt(this.samples.reduce((sum,n)=>sum+n*n,0)/this.samples.length);
          const time=context.currentTime-this.samples.length/(2*context.sampleRate);
          if(this.detector.hear(rms,time,{floor:this.floor??.008,ratio:this.ratio??1.6})){
            const event=this.onAttack(time);
            if(event){setTimeout(()=>{
              if(request!==this.request||!this.pitchAnalyser)return;
              this.pitchAnalyser.getFloatTimeDomainData(this.pitchSamples);
              const reading=detectPitch(this.pitchSamples,context.sampleRate,{noiseFloor:.001,minHz:60});
              this.onPitch(event,reading.frequency&&reading.confidence>.8?pitchNote(reading.frequency):null);
            },75);}
          }
        }
        this.onFrame(context.currentTime,rms);
      },8);
      return true;
    }catch(error){
      stream?.getTracks().forEach(t=>t.stop());
      if(request!==this.request)return false;
      this.stop();this.onState('error',error.name==='NotAllowedError'?'Microphone access was blocked. Allow it in your browser settings, then retry.':error.message);return false;
    }
  }
  click(at,accent=false,quiet=false){
    if(!this.context||this.clicks.has(at))return;
    this.clicks.add(at);for(const t of this.clicks)if(t<at-12)this.clicks.delete(t);
    const tone=this.context.createOscillator(),gain=this.context.createGain();
    tone.frequency.value=accent?1200:800;
    const start=Math.max(at,this.context.currentTime);gain.gain.setValueAtTime(quiet?.035:.11,start);gain.gain.exponentialRampToValueAtTime(.0001,start+.045);
    tone.connect(gain);gain.connect(this.context.destination);this.voices.add(tone);tone.onended=()=>{this.voices.delete(tone);gain.disconnect();};tone.start(start);tone.stop(start+.05);
  }
  get now(){return this.context?.currentTime??0;}
  stop(){
    ++this.request;clearInterval(this.timer);this.timer=null;
    this.stream?.getTracks().forEach(t=>t.stop());this.source?.disconnect();
    for(const voice of this.voices){try{voice.stop();}catch{/* Already ended. */}}
    this.voices.clear();this.clicks.clear();
    if(this.context&&this.context.state!=='closed')this.context.close().catch(()=>{});
    this.context=this.source=this.analyser=this.pitchAnalyser=this.stream=null;
    this.onState('idle');
  }
}
