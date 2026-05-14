import { createWorld, type IWorld } from 'bitecs';

// bitECSの世界（ワールド）を作成。ここに数万のEntityが登録されます。
export const world: IWorld = createWorld();
