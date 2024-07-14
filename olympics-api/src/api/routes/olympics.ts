import _ from "lodash";

import olympics from "@/api/controllers/olympics.ts"
import Request from "@/lib/request/Request.ts"

export default {

    prefix: '/olympics',

    get: {

        '/games': async (request: Request) => {
            return await olympics.getGames();
        },
        
        '/medals': async (request: Request) => {
            request
                .validate('query.game_id', _.isString);
            const { game_id: gameId } = request.query;
            return await olympics.getMedals(gameId);
        },

        '/sports': async (request: Request) => {
            request
                .validate('query.game_id', _.isString);
            const { game_id: gameId } = request.query;
            return await olympics.getSports(gameId);
        },

        '/schedules': async (request: Request) => {
            request
                .validate('query.game_id', v => _.isUndefined(v) || _.isString(v));
            const { game_id: gameId } = request.query;
            return await olympics.getSchedules(gameId);
        },

        '/athletes': async (request: Request) => {
            request
                .validate('query.game_id', _.isString)
                .validate('query.sport_id', v => _.isUndefined(v) || _.isString(v))
                .validate('query.team_code', v => _.isUndefined(v) || _.isString(v));
            const { game_id: gameId, sport_id: sportId, team_code: teamCode } = request.query;
            return await olympics.getAthletes(gameId, sportId, teamCode);
        }

    }
    
}