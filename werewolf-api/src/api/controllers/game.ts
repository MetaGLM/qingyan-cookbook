import _ from 'lodash';

import nickname from '../consts/nickname.ts';
import IRoom from '../interfaces/IRoom.ts';
import IPlayer from '../interfaces/IPlayer.ts';

const rooms = {};

let gameId = 1;

function createRoom(count: number) {
  const werewolfCount = Math.max(Math.floor(count * 0.25), 1);
  const prophetCount = Math.max(Math.floor(count * 0.2), 1);
  const civilianCount = count - (werewolfCount + prophetCount);
  let players: IPlayer[] = []
  // 分配狼人
  for(let i = 0;i < werewolfCount;i++) {
    players.push({
      role: '狼人',
      name: '',
      live: true,
      talks: [],
      votes: [],
      driver: 'Agent'
    });
  }
  // 分配预言家
  for(let i = 0;i < prophetCount;i++) {
    players.push({
      role: '预言家',
      name: '',
      live: true,
      talks: [],
      votes: [],
      driver: 'Agent'
    });
  }
  // 分配平民
  for(let i = 0;i < civilianCount;i++) {
    players.push({
      role: '平民',
      name: '',
      live: true,
      talks: [],
      votes: [],
      driver: 'Agent'
    });
  }
  // 打乱的玩家列表
  players = _.shuffle(players);
  // 打乱昵称列表
  const _nickname = _.shuffle(nickname);
  // 分配玩家名字
  players = players.map((player, index) => {
    player.name = _nickname[index];
    return player;
  });
  // 选取一个玩家作为用户
  const userPlayer = _.sample(players);
  userPlayer.driver = 'User';
  // 房间
  const room: IRoom = {
    // 房间ID
    id: generateId(),
    // 玩家列表
    players,
    // 当前轮次
    round: 1,
    // 当前时间
    time: '白天',
  };
  rooms[room.id] = room;
  return room;
}

function getCivilianPlayers(room: IRoom) {
  return room.players.filter(player => player.role == '平民' && player.live);
}

function getWerewolfPlayers(room: IRoom) {
  return room.players.filter(player => player.role == '狼人' && player.live);
}

function getProphetPlayers(room: IRoom) {
  return room.players.filter(player => player.role == '预言家' && player.live);
}

function getLivePlayers(room: IRoom) {
  return room.players.filter(player => player.live);
}

function getLivePlayersExcludeWerewolf(room: IRoom) {
  return room.players.filter(player => player.role != '狼人' && player.live);
}

function getCurrentRoundNotTalkPlayers(room: IRoom) {
  const players = getLivePlayers(room);
  const talkIndex = room.round - 1;
  const notTalkPlayers = players.filter(player => !player.talks[talkIndex]);
  return notTalkPlayers;
}

function getCurrentRoundNotVotePlayers(room: IRoom) {
  const players = getLivePlayers(room);
  const voteIndex = room.round - 1;
  const notVotePlayers = players.filter(player => !player.votes[voteIndex]);
  return notVotePlayers;
}

function getUserPlayer(room: IRoom) {
  return room.players.filter(player => player.driver == 'User')[0] || null;
}

function getPlayerByNickname(room: IRoom, nickname: string) {
  return room.players.filter(player => player.name == nickname)[0] || null;
}

function getRoom(roomId: string): IRoom {
  return rooms[roomId];
}

function getContext(room: IRoom) {
  const players = room.players;
  const talks = [];
  const votes = [];
  for(let i = 0;i < room.round;i++) {
    for(let player of players) {
      if(player.talks[i])
        talks.push(`${player.name}：${player.talks[i]}。`);
      if(player.votes[i])
        votes.push(`${player.name}：投票了${player.votes[i]}`);
    }
  }
  return `${talks.join('\n')}\n\n${votes.join('\n')}`
}

function generateId() {
  return padWithZeros(gameId++);
}

function padWithZeros(number: number) {
  let str = number.toString();
  while (str.length < 6) {
    str = "0" + str;
  }
  return str;
}

function switchDayNight(room: IRoom) {
  if(room.time == '白天')
    room.time = '夜晚';
  else {
    room.round++;
    room.time = '白天';
  }
}

export default {
  createRoom,
  getRoom,
  getUserPlayer,
  getLivePlayers,
  getCivilianPlayers,
  getWerewolfPlayers,
  getProphetPlayers,
  getPlayerByNickname,
  getLivePlayersExcludeWerewolf,
  getCurrentRoundNotTalkPlayers,
  getCurrentRoundNotVotePlayers,
  switchDayNight,
  getContext
}