import { Deferred, Install, Instance, ServiceDef, servicesLib } from "taj-data-services"
import { ContextImpl2 } from "taj-data-server"
import { initServices } from "../../../domain/lib/common/init-services.js"
import { APP_ID, createCacheRepo, ServiceResult } from "edu-ai-domain"
import { ENV_TARGET, INSTANCE_ID, NODE_ID } from "../config.js"
import { createProducer } from 'taj-data-server';
// import { TableRepoPostgres } from "taj-data-server/lib/repo/postgres/ods.js"
import { TableRepoPostgresV2 } from 'taj-data-server';
import { KAFKA_INFO, POSTGRES_INFO, REDIS_INFO, SERVER_INFO } from "./config.js"
import pg from 'pg';
import { PostgresClient } from 'taj-data-server';
import { createCachRepo } from 'taj-data-server';
import { PostgresRepoImpl2 } from 'taj-data-server';


export const createTajData = async () => {

        const producer = await createProducer(KAFKA_INFO.ip);
    
        const database = "edu_ai"
        const options: pg.PoolConfig = {
            host: POSTGRES_INFO.ip,
            port: POSTGRES_INFO.port,
            user: 'tajdata',
            password: 'jw8s0F4',
            application_name: 'taj-data',
            keepAlive: true,
            database: database,
            max: 50,
            min: 10,
        };
        console.log('Connecting to postgres: ', options);
        const client = new pg.Pool(options);

        let odsDef: Deferred<PostgresClient> | undefined = undefined
        

        const getConnection = async (scope: any) => {
        
                // const connKey = scope.instanceId
                // const connKey = "universal"
        
                if (!odsDef) {
                    odsDef = new Deferred();

                    client
                        .connect()
                        .then(() => {
                            odsDef?.resolve(client);
                        })
                        .catch((err) => {
                            console.error(`Cannot connect to ods DB (${database}).`, err.message);
                            odsDef?.reject(new Error(`Cannot connect to ods DB (${database}).`));
                            // to retry next time:
                            odsDef = undefined
                        });
                }
                return odsDef.promise;
            }
        const dwhV2 = new TableRepoPostgresV2(getConnection);
    
        await getConnection({})
        // @ts-ignore

            
        let mainRepoDef: Deferred<PostgresRepoImpl2> | undefined = undefined

    const context = new ContextImpl2(
        NODE_ID,
        {
            maxLoadLimit: 100,
            ip: SERVER_INFO.ip,
            datacenter: SERVER_INFO.datacenter,
            kafkaBrokers: KAFKA_INFO.ip,
            postgresHost: POSTGRES_INFO.ip,
            postgresPort: POSTGRES_INFO.port,
            redisHost: REDIS_INFO.host,
            redisPort: REDIS_INFO.port,
        },
        producer,
        undefined,
        dwhV2,
        createCachRepo(),
        async () => {

            if(!mainRepoDef) {
                mainRepoDef = new Deferred<PostgresRepoImpl2>();

                const schema = getSchemaName(INSTANCE_ID)
                const mainRepo = new PostgresRepoImpl2(client, undefined, NODE_ID, INSTANCE_ID, schema, (data, runId) => {
                    return context.onCommit(data, runId)
                }, undefined, undefined)

                await mainRepo.init()
                mainRepoDef.resolve(mainRepo)
            }
            return mainRepoDef.promise
        },
        async (instanceId: string) => {

            const result: Install["Data"]["primary"] = {
                status: {}
            }
            
            const schemaName = getSchemaName(instanceId)
            try {
                console.log(`install ${instanceId}`, 1)
            
                // Check if schema exists in PostgreSQL
                const schemaRes = await client.query(
                    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
                    [schemaName]
                )
            
                if (schemaRes.rows.length > 0) {
                    result.status.keyspace = "exists" // kept keyspace property name for compatibility
                } else {
                    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
                    result.status.keyspace = "created"
                }
            
                // Items Table
                await client.query(`CREATE TABLE "${schemaName}".items (
                    cid TEXT,
                    pid TEXT,
                    id TEXT,
                    action TEXT,
                    time BIGINT,
                    source TEXT,
                    data jsonb,
                    attrs jsonb,
                    "user" TEXT,
                    "version" TEXT,
                    PRIMARY KEY (cid, pid, id)
                );`)
                .then(() => result.status.items = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.items = "exists"
                    } else {
                        throw err
                    }
                })
            
                // Links Table
                await client.query(`CREATE TABLE "${schemaName}".links ( 
                    cid TEXT,
                    pid TEXT,
                    id TEXT,
                    "linkId" TEXT,
                    type TEXT,
                    point TEXT,
                    key TEXT,
                    action TEXT,
                    time BIGINT,
                    source TEXT,
                    pk TEXT,
                    data jsonb,
                    attrs jsonb,
                    "user" TEXT,
                    PRIMARY KEY (cid, pid, "linkId", type, point, id, key)
                );`)
                .then(() => result.status.links = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.links = "exists"
                    } else {
                        throw err
                    }
                })
            
                // Item History Table
                await client.query(`CREATE TABLE "${schemaName}".item_history (
                    cid TEXT,
                    pid TEXT,
                    id TEXT,
                    chid TEXT,
                    action TEXT,
                    time BIGINT,
                    source TEXT,
                    pk TEXT,
                    data jsonb,
                    attrs jsonb,
                    "user" TEXT,
                    PRIMARY KEY (cid, pid, id, chid)
                );`)
                .then(() => result.status.item_history = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.item_history = "exists"
                    } else {
                        throw err
                    }
                })
            
                // Link History Table
                await client.query(`CREATE TABLE "${schemaName}".link_history ( 
                    cid TEXT,
                    pid TEXT,
                    id TEXT,
                    "linkId" TEXT,
                    type TEXT,
                    point TEXT,
                    key TEXT,
                    chid TEXT,
                    action TEXT,
                    time BIGINT,
                    data jsonb,
                    source TEXT,
                    pk TEXT,
                    attrs jsonb,
                    "user" TEXT,
                    PRIMARY KEY (cid, pid, "linkId", type, point, id, key, chid)
                );`)
                .then(() => result.status.link_history = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.link_history = "exists"
                    } else {
                        throw err
                    }
                })
            
                // Pending Messages Table
                await client.query(`CREATE TABLE "${schemaName}".pendingMessages (
                    pid TEXT,
                    key TEXT,
                    data jsonb,
                    PRIMARY KEY (pid, key)
                );`)
                .then(() => result.status.pendingMessages = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.pendingMessages = "exists"
                    } else {
                        throw err
                    }
                })
            
                // Partitions Table
                await client.query(`CREATE TABLE "${schemaName}".partitions (
                    "group" TEXT, 
                    pid TEXT,
                    PRIMARY KEY ("group", pid)
                );`)
                .then(() => result.status.partitions = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.partitions = "exists"
                    } else {
                        throw err
                    }
                })
            
                // Nodes Table
                await client.query(`CREATE TABLE "${schemaName}".nodes (
                    nodeName TEXT, 
                    nodeId TEXT,
                    data jsonb,
                    PRIMARY KEY (nodeName, nodeId)
                );`)
                .then(() => result.status.nodes = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.nodes = "exists"
                    } else {
                        throw err
                    }
                })
            
                // Locks Table
                await client.query(`CREATE TABLE "${schemaName}".locks (
                    key TEXT PRIMARY KEY,
                    data jsonb,
                    wait_list TEXT[]
                );`)
                .then(() => result.status.locks = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.locks = "exists"
                    } else {
                        throw err
                    }
                })
            
                // Transactions Table
                await client.query(`CREATE TABLE "${schemaName}".transactions (
                    pid TEXT,
                    id TEXT,
                    data jsonb,
                    PRIMARY KEY (pid, id)
                );`)
                .then(() => result.status.transactions = "created")
                .catch(err => {
                    if (err.code === '42P07' || err.message.includes("already exists")) {
                        result.status.transactions = "exists"
                    } else {
                        throw err
                    }
                })
            
                console.log(`install ${instanceId}`, 2)
            }
            catch (err: any) {
                result.error = err.message
            }
            
            console.log(`install ${instanceId}`, 3)
            return result

        }
    );


        const services = initServices(
        'taj-data',
        servicesLib,
        {
                cacheRepo: createCacheRepo(),
        },
        )(context, {
                cloud: {
                    // @ts-ignore
                        getInstance: async () => {
                                const inst: Instance = {
                                    key: INSTANCE_ID
                                }
                                
                                const result: ServiceResult<any> = {
                                    app: APP_ID,
                                    service: 'get-instance',
                                    warnings: [],
                                    data: {
                                        instance: inst
                                    },
                                };
                                return result
                        },
                        getTypeSchema: () => {
                                throw new Error(`[taj-data] getTypeSchema not implemented yet`)
                        },
                        publishNotification: () => {
                                throw new Error(`[taj-data] publishNotification not implemented yet`)
                        },
                }
        })

        return services
}

const getSchemaName = (instanceId: string) => {

    let schemaName = `app_${instanceId}`
    schemaName = schemaName.replace(/\-/g, '_')
    if (schemaName == "app_gormic_cloud_data" && ENV_TARGET != "DEV") {
        schemaName = "gormic_cloud"
    }
    
    return schemaName
}