import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import game from '@/api/controllers/game.ts';
import chat from '../controllers/chat.ts';
import roleRules from '../consts/role-rules.ts';
import logger from '@/lib/logger.ts';

const API_KEY = 'XXXXX.XXXXXXXXXX';

export default {

    prefix: '/game',

    post: {

        "/test": async (request: Request) => {
            const result = await chat.createCompletion('66798ee70386751766770910', [
                {
                    role: 'user',
                    content: '你是谁？'
                }
            ], API_KEY);
            console.log(result.choices[0].message.content);
            return result;
        },

        /**
         * 创建游戏房间
         */
        '/create_room': async (request: Request) => {
            request
                .validate('body.count', v => _.isUndefined(v) || _.isFinite(v));
            const count = _.defaultTo(request.body.count, 6);
            const room = await game.createRoom(count);
            const civilians = game.getCivilianPlayers(room);
            const prophets = game.getProphetPlayers(room);
            const werewolfs = game.getWerewolfPlayers(room);
            const userPlayer = game.getUserPlayer(room);
            return [
                `【房间已成功创建】`,
                `房间号：${room.id}（无需告知用户，仅作为后续工具调用参数）`,
                `\n玩家分配如下：`,
                `平民玩家（${civilians.length}名）`,
                `预言家玩家（${prophets.length}名）`,
                `狼人玩家（${werewolfs.length}名）\n`,
                `\n所有玩家的昵称：${room.players.map(player => player.name).join('、')}\n`,
                `用户操作的玩家是“${userPlayer.name}”，身份为${userPlayer.role}，其余玩家均为AI玩家。`,
                `用户作为${userPlayer.role}，相应的角色设定是：${roleRules[userPlayer.role]}\n`,
                `现在是白天，请告知用户分配给它的昵称和身份以及AI玩家昵称，并要求它保密身份，然后要求用户确认。确认后请说“天黑请闭眼”并调用SwitchDayNight工具切换到夜晚。`
            ].join('\n');
        },

        /**
         * 玩家发言
         */
        '/player/talk': async (request: Request) => {
            request
                .validate('body.room_id', _.isString)
                .validate('body.user_talk', v => _.isUndefined(v) || _.isString(v));
            const roomId = request.body.room_id;
            const userTalk = request.body.user_talk;
            const room = game.getRoom(roomId);
            if(!room)
                return '【房间不存在】\n请要求用户重新开启会话创建新房间。';
            if(room.time == '夜晚')
                return '【现在不是白天】\n玩家讨论只有在白天才能进行，你需要先调用SwitchDayNight工具切换到白天，但前提是狼人和预言家已经完成动作。';
            const notTalkPlayers = game.getCurrentRoundNotTalkPlayers(room);
            if(notTalkPlayers.length == 0)
                return `【讨论结束】\n所有玩家已经发言完毕，下一个环节是投票，请调用PlayerVote进入下一个环节。`;
            const notTalkPlayer = notTalkPlayers.shift();
            if(notTalkPlayer.driver == 'User') {
                if(userTalk) {
                    notTalkPlayer.talks.push(userTalk);
                    return `【${notTalkPlayer.name}发言】\n${userTalk}`;
                }
                return `【发言玩家是用户自己】\n本轮发言玩家是用户，请让用户发言，用户发言后请继续调用PlayerTalk让下一位玩家发言。`;
            }
            else {
                const context = game.getContext(room);
                const result = await chat.createCompletion('66798ee70386751766770910', [
                    {
                        role: 'user',
                        content: `${context}\n\n以上是历史记录\n\n现在轮到你发言，你的昵称是${notTalkPlayer.name}，现在是白天，请根据历史记录发表你的发言：\n`
                    }
                ], API_KEY);
                return `【${notTalkPlayer.name}发言】${result.choices[0].message.content}`;
            }
        },

        /**
         * 玩家投票
         */
        '/player/vote': async (request: Request) => {
            request
                .validate('body.room_id', _.isString)
                .validate('body.user_vote', v => _.isUndefined(v) || _.isString(v));
            const roomId = request.body.room_id;
            const userVote = request.body.user_vote;
            const room = game.getRoom(roomId);
            if(!room)
                return '【房间不存在】\n请要求用户重新开启会话创建新房间。';
            if(room.time == '夜晚')
                return '【现在不是白天】\n玩家讨论只有在白天才能进行，你需要先调用SwitchDayNight工具切换到白天，但前提是狼人和预言家已经完成动作。';
            const notVotePlayers = game.getCurrentRoundNotVotePlayers(room);
            if(notVotePlayers.length == 0) {
                // TODO 结算投票
                return `【投票结束】\n所有玩家已经投票完毕，本轮没有玩家被淘汰，请调用SwitchDayNight工具切换到夜晚`;
            }
            const notVotePlayer = notVotePlayers.shift();
            if(notVotePlayer.driver == 'User') {
                if(userVote) {
                    if(!game.getPlayerByNickname(room, userVote))
                        return `【玩家不存在】\n玩家“${userVote}”不存在，请要求用户重新输入被投票玩家，用户投票后请继续调用PlayerVote让下一位玩家投票。`
                    notVotePlayer.votes.push(userVote);
                    return `【${notVotePlayer.name}投票】\n${userVote}`;
                }
                return `【投票玩家是用户自己】\n本轮投票玩家是用户，请让用户投票，用户投票后请继续调用PlayerVote让下一位玩家投票。`;
            }
            else {
                const context = game.getContext(room);
                const result = await chat.createCompletion('66798ee70386751766770910', [
                    {
                        role: 'user',
                        content: `${context}\n\n以上是历史记录\n\n现在轮到你投票，你的昵称是${notVotePlayer.name}，现在是白天，请根据历史记录投出你觉得可疑的玩家昵称：\n`
                    }
                ], API_KEY);
                return `【${notVotePlayer.name}投票】${result.choices[0].message.content}`;
            }
        },

        /**
         * 狼人杀人
         */
        '/werewolf/kill': async (request: Request) => {
            request
                .validate('body.room_id', _.isString);
            const roomId = request.body.room_id;
            const room = game.getRoom(roomId);
            if(!room)
                return '【房间不存在】\n请要求用户重新开启会话创建新房间。';
            if(room.time == '白天')
                return '【现在不是夜晚】\n狼人只有在夜晚才能出动，你需要先调用SwitchDayNight工具切换到夜晚，但前提玩家已经完成讨论和投票。';
            const userPlayer = game.getUserPlayer(room);
            if(userPlayer.role == '狼人') {
                return '【等待用户指令】\n告知用户的身份是狼人，要求提供要杀害的玩家昵称，你将调用UserWerewolfKill工具完成处理。';
            }
            else {
                const players = game.getLivePlayersExcludeWerewolf(room);
                const context = game.getContext(room);
                const result = await chat.createCompletion('66798ee70386751766770910', [
                    {
                        role: 'user',
                        content: `${context}\n\n以上是历史记录\n\n现在轮到你挑选杀害一名玩家，现在是夜晚，请根据历史记录挑选你想杀害的玩家昵称：\n`
                    }
                ], API_KEY);
                console.log(result.choices[0].message.content);
                // 随机杀害一名玩家
                const killPlayer = _.sample(players);
                // killPlayer.killer =
                killPlayer.live = false;
                return '【狼人已完成行动】\n狼人已经杀害了一名玩家，接下来轮到预言家查验玩家，你将调用ProphetCheck工具。'
            }
        },

        /**
         * 预言家查人
         */
        '/prophet/check': async (request: Request) => {
            request
                .validate('body.room_id', _.isString);
            const roomId = request.body.room_id;
            const room = game.getRoom(roomId);
            if(!room)
                return '【房间不存在】\n请要求用户重新开启会话创建新房间。';
            if(room.time == '白天')
                return '【现在不是夜晚】\n预言家只有在夜晚才能查验玩家，你需要先调用SwitchDayNight工具切换到夜晚，但前提玩家已经完成讨论和投票。';
            const userPlayer = game.getUserPlayer(room);
            if(userPlayer.role == '预言家') {
                return '【等待用户指令】\n告知用户的身份是预言家，要求提供要查验的玩家昵称，你将调用UserProphetCheck工具完成查验。';
            }
            else {
                const players = game.getLivePlayers(room);
                const context = game.getContext(room);
                const result = await chat.createCompletion('66798ee70386751766770910', [
                    {
                        role: 'user',
                        content: `${context}\n\n以上是历史记录\n\n现在轮到你查验一名玩家，现在是夜晚，请根据历史记录挑选想查验身份的玩家昵称：\n`
                    }
                ], API_KEY);
                console.log(result.choices[0].message.content);
                // 随机查验一名玩家
                const checkPlayer = _.sample(players);
                checkPlayer.checked = true;
                return `【预言家已完成查验】\n预言家已经查验了一名玩家的身份，你将说“天亮请睁眼”，然后调用SwitchDayNight工具切换到白天，开始讨论和投票。`
            }
        },

        /**
         * 切换昼夜
         */
        '/switch_day_night': async (request: Request) => {
            request
                .validate('body.room_id', _.isString);
            const roomId = request.body.room_id;
            const room = game.getRoom(roomId);
            if(!room)
                return '【房间不存在】\n请要求用户重新开启会话创建新房间。';
            game.switchDayNight(room);
            let tips = '';
            if(room.time == '白天') {
                const notTalkPlayers = game.getCurrentRoundNotTalkPlayers(room);
                tips = `目前存活的${notTalkPlayers}位玩家将轮流参与讨论，请调用PlayerTalk工具让第一位玩家开始发言。`;
            }
            else {
                tips = '狼人可以开始出动了！请调用WerewolfKill工具杀害一名玩家，工具将自动完成决策。';
            }
            return [
                `【昼夜切换完成】`,
                `当前是：${room.time}`,
                tips
            ].join('\n');
        },

    }

}