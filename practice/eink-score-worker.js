import {parentPort,workerData} from 'node:worker_threads';
import {readerScore} from './eink-data.js';
try{parentPort.postMessage({result:readerScore(workerData.bytes,workerData.options)});}
catch(error){parentPort.postMessage({error:error.message});}
