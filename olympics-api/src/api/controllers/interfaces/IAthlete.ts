import IMedals from "./IMedals.ts";

export default interface IAthlete {
    /** 运动员名称 */
    name: string;
    /** 运动员照片URL */
    image: string;
    /** 运动员主页URL */
    url: string;
    /** 运动员参与的运动 */
    sport: string;
    /** 运动员获得的奖牌 */
    medals: IMedals;
}