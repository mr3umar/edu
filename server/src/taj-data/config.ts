import { ipToId } from '../common/ip-to-id.js';
import { CassandraTypes } from 'taj-data-server';

export const DEPLOYMENT_ID = 'taj-data-v2'
export const HTTP_PORT = process.argv[2] || 9003;
export const ENV_TARGET = (process.env.ENV_TARGET ?? 'DEV') as 'PROD' | 'TEST' | 'DEV'
console.log(`ENV_TARGET: ${ENV_TARGET}`);
export let PORT = ENV_TARGET === 'PROD' || ENV_TARGET === 'TEST' ? 80 : 8888;
export let PORT2 = 8001;

if(process.argv[2]){
    PORT = Number(process.argv[2])
}

export const POD_NAME = process.env.POD_NAME;
export const POD_NAMESPACE = process.env.POD_NAMESPACE;
export const POD_IP = process.env.POD_IP;
export const KUBE_NODE_ID = POD_IP ? ipToId(POD_IP) : '0';
console.log(`POD_NAME: ${POD_NAME}`);
console.log(`POD_NAMESPACE: ${POD_NAMESPACE}`);
console.log(`POD_IP: ${POD_IP}`);
console.log(`KUBE_NODE_ID: ${KUBE_NODE_ID}`);

export const READ_REPAIR_MEM_TTL = 60 * 60 * 24 * 7
export const PARTITIONS_MEM_TTL = 60 * 60 * 24 * 30
export const MEM_REPO_TTL = 60 * 60 * 24 * 1

let STATEFULSET_SEQ = '0'

if(POD_NAME){
    const strs = POD_NAME?.split("-") ?? []
    STATEFULSET_SEQ = strs[strs?.length - 1]
    if(isNaN(Number(STATEFULSET_SEQ)) || STATEFULSET_SEQ.trim() === ""){
        throw new Error(`Cannot get statfulset seq number. POD_NAME: ${POD_NAME}`)
    }
}

export const NODE_ID = `node-${STATEFULSET_SEQ}`;

console.log(`NODE_ID: ${NODE_ID}`);

const CONFIG = {
    PROD: {
        // cassandra: {
        //     ip: ['10.106.0.8', '10.106.0.17', '10.106.0.18'], //['cassandra.default.svc.cluster.local'],
        //     // ip: ['10.106.0.18'], //['cassandra.default.svc.cluster.local'],
        //     datacenter: 'DC3',
        // },
        cassandra: {
            ip: ['10.106.0.2'], //['cassandra.default.svc.cluster.local'],
            // ip: ['10.106.0.18'], //['cassandra.default.svc.cluster.local'],
            datacenter: 'DC5',
            replication: `{'class' : 'NetworkTopologyStrategy', 'DC5' : 1}`
        },
        kafka: {
            ip: ['10.106.0.8:9092'], //['taj-data-kafka.default.svc.cluster.local:9092'],
        },
        postgres: {
            ip: '10.106.0.8',//'postgres.default.svc.cluster.local',
            port: 5432,
        },
        redis: {
            host: '10.106.0.8',
            port: 6379,
        },
        gormicCloud: {
            url: "http://gormic-cloud.default.svc.cluster.local"
        }
    },
    TEST: {
        cassandra: {
            ip: ['cassandra-test.default.svc.cluster.local'],
            datacenter: 'DC1',
            replication: `{'class' : 'NetworkTopologyStrategy', 'DC1' : 1}`,
        },
        kafka: {
            // ip: ['10.106.0.17:9092'],
            ip: ['10.106.0.18:9092'],
        },
        postgres: {
            ip: '10.106.0.18', //206.189.117.93
            port: 5432,
        },
        redis: {
            host: '10.106.0.18',
            port: 6379,
        },
        gormicCloud: {
            url: "http://gormic-cloud-test.default.svc.cluster.local"
        }
    },
    DEV: {
        cassandra: {
            // ip: ['127.0.0.1:9041', '127.0.0.1:9042', '127.0.0.1:9043'],
            ip: ['127.0.0.1:9042'],
            datacenter: 'datacenter1',
            replication: `{'class' : 'NetworkTopologyStrategy', 'datacenter1' : 3}`,
        },
        kafka: {
            ip: ['127.0.0.1:9092'],
        },
        postgres: {
            ip: 'localhost',
            port: 5432,
        },
        redis: {
            host: 'localhost',
            port: 6379,
        },
        gormicCloud: {
            url: "http://localhost:9003"
        }
    },
};

const env = (ENV_TARGET ?? 'DEV') as keyof typeof CONFIG;

export const SERVER_INFO = CONFIG[env]?.cassandra;
export const KAFKA_INFO = CONFIG[env]?.kafka;
export const POSTGRES_INFO = CONFIG[env]?.postgres;
export const REDIS_INFO = CONFIG[env]?.redis;
export const GORMIC_CLOUD_CONFIG = CONFIG[env]?.gormicCloud;
export const CASSANDRA_REPLICATION = CONFIG[env]?.cassandra?.replication;

export const CASSANDRA_CONSISTENCY = CassandraTypes.consistencies.localQuorum
// export const CASSANDRA_CONSISTENCY = CassandraTypes.consistencies.localOne
export const CASSANDRA_CONSISTENCY_SERIAL = CassandraTypes.consistencies.localSerial
// export const CASSANDRA_CONSISTENCY_SERIAL = CassandraTypes.consistencies.localOne

export const GORMIC_CLOUD_URL =
    ENV_TARGET === 'PROD'
        ? 'http://gormic-cloud-v1-1-internal-prod.prod.svc.cluster.local'
        : ENV_TARGET === 'TEST'
          ? 'http://gormic-cloud-v1-1-internal-test.default.svc.cluster.local'
          : 'http://localhost:9003';