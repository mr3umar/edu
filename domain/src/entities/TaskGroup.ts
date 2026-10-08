import { ItemPK, MetaData } from '@dija/taj-data-services';
import { UID_SCHEMA } from '../config.js';
import { mapTask, TaskE, TaskM } from './Task.js';

export type TaskGroupE = {
    pk: ItemPK;
    data: {
        clientRequestId: string;
        status: 'running' | 'completed' | 'canceled' | 'paused'
        completedAt?: string
    };
    meta: MetaData
    links: {
        conversation?: ItemPK;
    };
    childs: {
        tasks: TaskE[]
    };
};

export enum TaskGroupLinkKeys {
    conversation = "conversation"
}

export enum TaskGroupChildsKeys {
    tasks = "tasks"
}

export type TaskGroupM = TaskGroupE['data'] & TaskGroupE['meta'] & {
    uid: string;
    conversationUid?: string;
    tasks: TaskM[]
};

export const mapTaskGroup = (item: TaskGroupE) => {

    const uid = UID_SCHEMA.taskGroups.toUid(item.pk)
    const map: TaskGroupM = {
        ...item.data,
        uid,
        conversationUid: item.links?.conversation ? UID_SCHEMA.conversations.toUid(item.links.conversation) : undefined,
        tasks: item.childs?.tasks ? item.childs?.tasks.map(mapTask) : [],
    };

    return map;
};
