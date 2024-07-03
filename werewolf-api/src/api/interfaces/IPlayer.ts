export default interface IPlayer {
    // 角色
    role: '狼人' | '平民' | '预言家' | '巫女' | '守卫';
    // 用户名
    name: string;
    // 是否存活
    live: boolean;
    // 是否被查验身份
    checked?: boolean;
    // 被谁杀了
    killer?: string;
    // 发言列表
    talks: string[];
    // 投票列表
    votes: string[];
    // 操纵者
    driver: 'User' | 'Agent';
}