import { TaskM } from "../entities/Task.js"

export const findTaskPath = (task: TaskM, tasks: TaskM[]): TaskM[][] => {
        const taskByUid = new Map(tasks.map(t => [t.uid, t]));
    
        const findPaths = (current: TaskM, path: TaskM[]): TaskM[][] => {
            const predecessors = (current.predecessorUids ?? [])
                .map(uid => taskByUid.get(uid))
                .filter((task): task is TaskM => task !== undefined);
    
            if (predecessors.length === 0) {
                return [path];
            }
    
            return predecessors.flatMap(predecessor =>
                findPaths(predecessor, [...path, predecessor])
            );
        };
    
        return findPaths(task, [task]);
    };
