import IPlayer from "./IPlayer.ts";

export default interface IRoom {
    // 房间ID
    id: string;
    // 当前是第几轮
    round: number;
    // 当前时间
    time: '白天' | '夜晚',
    // 玩家列表
    players: IPlayer[];
}