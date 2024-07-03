import _ from "lodash";
import fs from "fs";
import axios, { AxiosResponse } from "axios";

import APIException from "@/lib/exceptions/APIException.ts";
import EX from "@/api/consts/exceptions.ts";
import util from "@/lib/util.ts";

const schools = JSON.parse(fs.readFileSync('schools.json').toString());

/**
 * 伪装header
 */
const FAKE_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Accept-Language": "zh-CN,zh;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Origin: "https://www.gaokao.cn",
  Priority: "u=1, i",
  Referer: "https://www.gaokao.cn/",
  "Sec-Ch-Ua":
    '"Chromium";v="124", "Not(A:Brand";v="24", "Google Chrome";v="124"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "cross-site",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

/**
 * 科目映射
 */
const SUBJECT_MAP = {
  // 首选科目
  "物理": "70000",
  "历史": "70004",
  // 再选科目
  "化学": "70001",
  "生物": "70002",
  "政治": "70003",
  "地理": "70005",
};

/**
 * 高考地区映射
 */
const PROVINCE_MAP = {
  "北京": "11",
  "天津": "12",
  "河北": "13",
  "山西": "14",
  "内蒙古": "15",
  "辽宁": "21",
  "吉林": "22",
  "黑龙江": "23",
  "上海": "31",
  "江苏": "32",
  "浙江": "33",
  "安徽": "34",
  "福建": "35",
  "江西": "36",
  "山东": "37",
  "河南": "41",
  "湖北": "42",
  "湖南": "43",
  "广东": "44",
  "广西": "45",
  "海南": "46",
  "重庆": "50",
  "四川": "51",
  "贵州": "52",
  "云南": "53",
  "西藏": "54",
  "陕西": "61",
  "甘肃": "62",
  "青海": "63",
  "宁夏": "64",
  "新疆": "65",
  "台湾": "71",
  "香港": "81",
  "澳门": "82",
  "国外": "99"
}

/** 推荐模式映射 */
const RECOM_MODE_MAP = {
  "综合": "0",
  "冲刺": "1",
  "稳妥": "2",
  "保底": "3"
};

/** 旧高考地区 */
const OLD_GAOKAO_PROVINCE = ["山西", "内蒙古", "河南", "四川", "云南", "陕西", "青海", "宁夏", "新疆"];

/**
 * 获取高考地区ID
 *
 * @param provinceName 高考地区名称
 */
function getProvinceId(provinceName: string) {
  for (let name in PROVINCE_MAP)
    if (provinceName.includes(name)) return PROVINCE_MAP[name];
  return null;
}

/**
 * 获取科目ID
 *
 * @param subjectName 科目名称
 */
function getSubjectId(subjectName: string) {
  for (let name in SUBJECT_MAP) {
    if (subjectName.includes(name)) return SUBJECT_MAP[name];
  }
  return null;
}

/**
 * 获取学科类型ID
 * 
 * @param subjectTypeName 学科类型名称
 */
function getSubjectTypeId(subjectTypeName: string) {
  if (subjectTypeName.includes('理'))
    return "1";
  if (subjectTypeName.includes('文'))
    return "2";
  return null;
}

/**
 * 获取推荐模式ID
 *
 * @param recomModeName 推荐模式名称
 */
function getRecomModeId(recomModeName: string) {
  for (let name of Object.keys(RECOM_MODE_MAP).reverse())
    if (recomModeName.includes(name)) return RECOM_MODE_MAP[name];
  return "2";
}

/**
 * 搜索院校
 * 
 * @param keyword 院校关键字
 */
async function searchUniversitys(
  keyword: string
) {
  const result = await axios.post(
    "https://api.zjzw.cn/web/api/",
    {},
    {
      params: {
        keyword,
        page: "1",
        province_id: "",
        ranktype: "",
        request_type: "1",
        size: "20",
        // top_school_id: "%5B3238%5D",
        type: "",
        uri: "apidata/api/gkv3/school/lists",
        signsafe: util.uuid()
      },
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const {
    numFound: total,
    item: list
  } = checkResult(result);
  return list;
}

/**
 * 搜索专业
 * 
 * @param keyword 专业关键字
 * @returns 
 */
async function searchMajors(
  keyword: string
) {
  const result = await axios.post(
    "https://api.zjzw.cn/web/api/",
    {},
    {
      params: {
        keyword,
        level1: "0",
        level2: "",
        level3: "",
        page: "1",
        signsafe: util.uuid(),
        size: "30",
        sort: "",
        uri: "apidata/api/gkv3/special/lists"
      },
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const {
    numFound: total,
    item: list
  } = checkResult(result);
  return list;
}

/**
 * 获取院校专业招生信息
 * 
 * @param schoolId 院校ID
 */
async function getMajorAdmissions(
  schoolId: string,
  province: string,
  majorName: string
) {
  let result = await axios.get(
    `https://mnzy.gaokao.cn/api/app/v2/v1/queryClassifyList`,
    {
      params: {
        majorName,
        zsgkId: schoolId,
        signsafe: util.uuid()
      },
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const classifys = checkResult(result);
  const classify = classifys.find(v => province.includes(v.province));
  if (!classify) {
    const provinces = classifys.map(v => v.province).join('、')
    throw new Error(`未找到专业在${province}地区招生信息，该专业仅在以下地区招生：\n${provinces}`);
  }
  result = await axios.get(
    `https://mnzy.gaokao.cn/api/app/v2/v1/query/universityMajorList`,
    {
      params: {
        province,
        classify: classify.classify,
        majorName,
        batch: classify.batch,
        zsgkId: schoolId,
        signsafe: util.uuid()
      },
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const majorAdmissions = checkResult(result);
  return majorAdmissions.reduce((str, item, index) => {
    const { majorName, majorCode, majorRemarks, studyCost, studyYear, claim, historyScore } = item;
    const _historyScore = _.attempt(() => JSON.parse(historyScore));
    let historyScoreContent;
    if (!_.isError(_historyScore)) {
      historyScoreContent = _historyScore.reduce((str, item) => {
        if (!_.isObject(item))
          return str;
        for (let key in item) {
          const [score, ranking, num] = item[key].split(',');
          str += `${key}年 招生${num}人 最低分为${score} 最低排名为${ranking}\n`
        }
        return str;
      }, '');
    }
    return str + `录取专业${index + 1}：${majorName}${majorRemarks ? ' - ' + majorRemarks : ''}\n代码：${majorCode}\n学制/学费：${studyYear}/每年￥${studyCost}\n选科：${claim}\n${historyScoreContent ? '录取情况：\n' + historyScoreContent : ''}\n`;
  }, '');
}

/**
 * 获取院校专业列表
 * 
 * @param schoolId 专业ID
 */
async function getMajors(
  schoolId: string
) {
  const result = await axios.get(
    `https://static-data.gaokao.cn/www/2.0/school/${schoolId}/pc_special.json`,
    {
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const { special_detail = {} } = checkResult(result);
  let majors = [];
  for (let key in special_detail) {
    const item = special_detail[key];
    if (!_.isArray(item))
      continue;
    majors = majors.concat(item);
  }
  const majorDetails = majors.reduce((str, major) => {
    const {
      // 专业名称
      special_name,
      // 专业层次
      type_name,
      // 学科门类
      level2_name,
      // 专业类别
      level3_name,
      // 专业学制
      limit_year
    } = major || {};
    return str + `专业名称：${special_name}\n层次：${type_name}\n学科门类:${level2_name}\n专业类别：${level3_name}\n学制：${limit_year}\n\n`;
  }, '');
  return majorDetails;
}

/**
 * 获取专业详情
 * 
 * @param majorId 专业ID
 */
async function getMajorDetails(
  majorId: string,
  schoolId?: string,
  province?: string
) {
  const result = await axios.get(
    `https://static-data.gaokao.cn/www/2.0/special/${majorId}/pc_special_detail.json`,
    {
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const {
    // 专业名称
    name,
    // 专业代码
    code,
    // 专业层次
    level1_name,
    // 是什么
    is_what,
    // 学什么
    learn_what,
    // 干什么
    do_what,
    // 开设课程
    course,
    // 修学年限
    limit_year,
    // 专业详解
    content,
    // 男女比例
    rate,
    // 文理比例
    rate2,
    // 最多就业岗位
    mostemployedeposition,
    // 最多就业行业
    mostemploymentindustry,
    // 毕业五年平均月薪
    professionalsalary,
    // 近三年就业率
    jobrate
  } = checkResult(result);
  const { salaryavg } = professionalsalary || {};
  const jobrateContent = jobrate.reduce((str, item) => {
    const { year, rate } = item || {};
    return str + `${year || '某'}年 ${rate}\n`;
  }, '');
  let majorAdmissions;
  if (schoolId)
    majorAdmissions = await getMajorAdmissions(schoolId, province, name);
  return `名称：${name}\n专业代码：${code}\n专业层次：${level1_name}\n修学年限：${limit_year}\n简介：${is_what || '无数据，请从网络查找'}\n学习内容：${learn_what || '无数据，请从网络查找'}\n未来工作内容：${do_what || '无数据，请从网络查找'}\n开设课程：${course || '无数据，请从网络查找'}\n最多就业岗位：${mostemployedeposition || '无数据，请从网络查找'}\n最多就业行业：${mostemploymentindustry || '无数据，请从网络查找'}\n近三年就业率：\n${jobrateContent || '无数据，请从网络查找'}毕业五年平均月薪：${salaryavg || '无数据，请从网络查找'}\n男女比例：${rate || '无数据，请从网络查找'}\n文理比例：${rate2 || '无数据，请从网络查找'}\n\n专业详解：\n${(content || '无数据，请从网络查找').replace(/<p>|<\/p>|<br>/g, '\n').replace(/<strong>|<\/strong>/g, '')}\n` + (province ? `\n院校往年录取情况（生源地 ${province}）：\n${majorAdmissions}` : '');
}

/**
 * 获取分数排名
 *
 * @param provinceId 高考地区ID
 * @param preferredSubjectId 首选科目
 * @param score 高考总分
 */
async function getScoreRanking(
  provinceId: string,
  preferredSubjectId: string,
  score: number
) {
  const result = await axios.post(
    "https://api.zjzw.cn/web/api/",
    {},
    {
      params: {
        local_province_id: provinceId,
        local_type_id: "3",
        preferred: preferredSubjectId,
        score,
        section_level: "",
        uri: "apidata/api/gkv3/recomScore/gettotal",
        signsafe: util.uuid(false),
      },
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const {
    item: { total },
  } = checkResult(result);
  return Number(total);
}

/**
 * 获取分数排名（旧高考）
 *
 * @param provinceId 高考地区ID
 * @param subjectTypeId 学科类型ID
 * @param score 高考总分
 */
async function getScoreRankingOld(
  provinceId: string,
  subjectTypeId: string,
  score: number
) {
  const result = await axios.post(
    "https://api.zjzw.cn/web/api/",
    {},
    {
      params: {
        local_province_id: provinceId,
        local_type_id: subjectTypeId,
        preferred: "",
        score,
        section_level: "",
        uri: "apidata/api/gkv3/recomScore/gettotal",
        signsafe: util.uuid(false),
      },
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const {
    item: { total },
  } = checkResult(result);
  return Number(total);
}

/**
 * 获取推荐的大学信息
 * 
 * @param provinceId 高考地区ID
 * @param targetProvinceId 目标大学地区ID
 * @param preferredSubjectId 首选科目ID
 * @param againSubjectIds 再选科目ID
 * @param score 高考总分
 * @param size 推荐个数
 */
async function getRecommendedUniversities(
  provinceId: string,
  targetProvinceId: string | null,
  preferredSubjectId: string,
  againSubjectIds: string[],
  recomModeId: string,
  score: number,
  size?: number
) {
  console.log(recomModeId)
  const ranking = await getScoreRanking(provinceId, preferredSubjectId, score)
  const result = await new Promise((resolve, reject) => {
    axios.post(
      "https://api.zjzw.cn/web/api/",
      {},
      {
        params: {
          again: againSubjectIds.join(','),
          local_province_id: provinceId,
          page: "1",
          preferred: preferredSubjectId,
          province_id: targetProvinceId || "",
          recom: recomModeId || "0",
          request_type: "1",
          score,
          section_level: "",
          size: `${size || 20}`,
          // top_id: "[202312095^B_P1QZ^14^645^0^661,202313380^B_P1QZ^14^643^610^661,202313322^B_P1QZ^14^629^0^3254,202310956^B_P1QZ^14^628^0^138,202313381^B_P1QZ^14^627^2041^661,202313382^B_P1QZ^14^621^2041^661,202310958^B_P1Q2^14^619^0^138,202310957^B_P1Q2Y3^14^618^0^138,202310959^B_P1QZ^14^616^207^138,202310700^B_P4Q5^14^609^0^3254,202311987^B_P1QZ^14^603^0^504,202310699^B_P4QZ^14^602^0^3254,202311400^B_P1QZ^14^601^0^108,202310698^B_P4QZ^14^599^0^3254,202311403^B_P1Q2X3^14^598^0^108,202311401^B_P1Q2Y3^14^596^0^108,202311406^B_P1QZ^14^596^0^108,202311405^B_P1QZ^14^595^0^108,202311402^B_P1Q2^14^594^0^108,202311404^B_P1Q2X3^14^593^207^108,20239848^B_P4Q5^14^593^0^504,202311982^B_P1QZ^14^591^0^504,202311984^B_P1Q2^14^588^0^504,20239535^B_P4QZ^14^584^0^108,202311983^B_P1Q2Y3^14^584^0^504,20239536^B_P4QZ^14^583^0^108,20239847^B_P4QZ^14^578^0^504,202311986^B_P1Q2Y6^14^578^207^504,20239537^B_P4QZ^14^575^625^108,20239846^B_P4QZ^14^574^0^504,202311407^B_P1QZ^14^571^0^108,202311985^B_P1QZ^14^562^207^504,202312527^B_P1QZ^14^560^0^2491,202312530^B_P1Q2X3^14^559^0^2491,202312531^B_P1Q5^14^557^0^2491,202312528^B_P1Q2Y3^14^554^0^2491,202312529^B_P1Q2^14^554^0^2491,202310124^B_P4Q5^14^543^0^2491,20239850^B_P4Q2Y6^14^541^207^504,202312533^B_P1QZ^14^541^207^2491,202312532^B_P1QZ^14^539^207^2491,202310123^B_P4QZ^14^534^0^2491,20239849^B_P4QZ^14^533^207^504,202310125^B_P4QZ^14^520^207^2491,202313171^B_P1QZ^14^490^0^1455,202313172^B_P1Q2Y3^14^490^0^1455,202313173^B_P1Q2^14^490^0^1455,202313174^B_P1Q3^14^490^0^1455,202313217^B_P1QZ^14^485^0^1329,202310579^B_P4QZ^14^485^0^1455,202312678^B_P1QZ^14^485^0^2482,202312677^B_P1QZ^14^484^0^2482,202313215^B_P1Q2^14^483^0^1329,202312680^B_P1QZ^14^481^0^2482,202312681^B_P1QZ^14^481^0^2482,202312679^B_P1Q2^14^480^0^2482,202310617^B_P4Q5^14^479^0^1329,202312434^B_P1QZ^14^476^0^966,202313216^B_P1QZ^14^476^207^1329,202310616^B_P4QZ^14^474^0^1329,202310074^B_P4QZ^14^471^0^966,202310618^B_P4QZ^14^471^207^1329,202313214^B_P1QZ^14^471^0^1329,202310228^B_P4QZ^14^471^0^2482,202312429^B_P1QZ^14^470^0^966,202312432^B_P1QZ^14^470^0^966,202312431^B_P1QZ^14^467^0^966,202310614^B_P4QZ^14^466^0^1329,202312436^B_P1QZ^14^464^0^966,202312435^B_P1QZ^14^463^0^966,202312433^B_P1QZ^14^462^0^966,202312430^B_P1QZ^14^461^625^966,202310619^B_P4QZ^14^461^0^1329,202312438^B_P1QZ^14^460^1725^966,202310077^B_P4QZ^14^459^0^966,202310075^B_P4QZ^14^458^0^966,202310076^B_P4QZ^14^457^0^966,202374497^B_P1QZ^10^453^988^972,202310615^B_P4QZ^14^453^0^1329,202374498^B_P1QZ^10^447^988^972,202313177^B_P1QZ^14^445^0^633,202312919^B_P1QZ^14^444^0^2484,202310369^B_P4QZ^14^441^0^2484,202313179^B_P1QZ^14^440^0^633,202312437^B_P1Q2^14^440^625^966,202313178^B_P1QZ^14^439^0^633,202313180^B_P1QZ^14^439^0^633,202313181^B_P1QZ^14^439^207^633,202310078^B_P4QZ^14^439^1725^966,202312920^B_P1Q2^14^439^0^2484,202312921^B_P1QZ^14^439^625^2484,202374499^B_P1QZ^10^438^988^972,202310581^B_P4QZ^14^433^0^633,202310582^B_P4QZ^14^433^0^633,202310583^B_P4QZ^14^433^0^633,202310584^B_P4QZ^14^433^0^633,202310370^B_P4Q2^14^433^0^2484,202310371^B_P4QZ^14^433^625^2484,202374500^B_P1QZ^10^431^988^972,202375091^B_P1QZ^10^424^988^2052,202375090^B_P1QZ^10^421^988^2052,202374501^B_P1QZ^10^418^988^972,202374099^B_P4QZ^10^417^988^2052,202375089^B_P1QZ^10^416^988^2052,202375097^B_P1QZ^10^414^988^2052,202373558^B_P4QZ^10^411^988^972,202374098^B_P4QZ^10^411^988^2052,202375093^B_P1QZ^10^404^0^2052,202375095^B_P1QZ^10^404^0^2052,202374269^B_P4QZ^10^404^0^3326,202375276^B_P1QZ^10^403^0^3326,202375092^B_P1Q2^10^402^0^2052,202375274^B_P1QZ^10^401^0^3326,202374272^B_P4QZ^10^400^0^3326,202374496^B_P1QZ^10^397^0^972,202375272^B_P1QZ^10^397^0^3326,202375273^B_P1QZ^10^396^0^3326,202374901^B_P1QZ^10^394^0^2291,202374271^B_P4QZ^10^392^0^3326,202374273^B_P4QZ^10^392^0^3326,202374270^B_P4QZ^10^391^0^3326,202374495^B_P1QZ^10^390^0^972,202375096^B_P1QZ^10^390^0^2052,202373556^B_P4QZ^10^389^0^972,202374101^B_P4QZ^10^389^0^2052,202375094^B_P1QZ^10^389^0^2052,202374946^B_P1QZ^10^385^0^633,202374100^B_P4QZ^10^383^0^2052,202375275^B_P1QZ^10^380^0^3326,202373557^B_P4QZ^10^378^0^972,202373936^B_P4QZ^10^377^0^2291,202373975^B_P4QZ^10^371^0^633,202375002^B_P1QZ^10^363^207^1404,202375098^B_P1QZ^10^357^0^2052,202375170^B_P1QZ^10^355^0^2681,202374029^B_P4QZ^10^354^207^1404,202374167^B_P4QZ^10^352^0^2681,202373658^B_P4QZ^10^332^0^2484,202374610^B_P1QZ^10^331^0^2484,202375169^B_P1QZ^10^330^0^2681,202374166^B_P4QZ^10^325^0^2681,202375001^B_P1QZ^10^391^0^1404,202374028^B_P4QZ^10^378^0^1404]",
          total: ranking,
          uri: "apidata/api/gkv3/recomScore/gufen_b",
          xktype: "1",
          zslx: "",
          signsafe: util.uuid(false),
        },
        headers: FAKE_HEADERS,
        timeout: 30000,
        validateStatus: () => true,
      }
    )
      .then(result => {
        checkResult(result);
        resolve(result)
      })
      .catch(() => {
        axios.post(
          "https://api.zjzw.cn/web/api/",
          {},
          {
            params: {
              local_province_id: provinceId,
              page: "1",
              elective: `${preferredSubjectId},${againSubjectIds.join(',')}`,
              province_id: targetProvinceId || "",
              recom: recomModeId || "0",
              request_type: "1",
              score,
              section_level: "",
              size: `${size || 20}`,
              // top_id: "[20232348^A_4Y6^14^647^0^3254,20232347^A_Z^14^637^0^3254,20233425^A_1^14^578^0^504,20233424^A_Z^14^575^0^504,20232496^A_Z^14^548^0^570,20232500^A_1^14^544^207^570,20232497^A_Z^14^543^0^570,20232501^A_2^14^542^207^570,20232495^A_Z^14^542^0^570,20232498^A_1^14^536^0^570,20232499^A_2^14^528^0^570,2023109576^A_Z^36^513^0^575,20232540^A_4Y6^14^506^0^575,2023109577^A_1^36^505^0^575,20232533^A_Z^14^500^0^575,20232539^A_1Y2Y6^14^498^0^575,20232536^A_1^14^495^0^575,20232534^A_Z^14^492^0^575,20232537^A_1^14^484^0^575,20232538^A_1Y2Y3^14^484^0^575,20232535^A_Z^14^482^0^575,20232541^A_Z^14^478^207^575,20232542^A_1^14^473^207^575,202222980^A_4Y6^14^648^0^3254,202222979^A_Z^14^639^0^3254,202224033^A_Z^14^563^0^504,202224034^A_1X2^14^542^0^504,202223124^A_Z^14^530^0^570,202223127^A_1^14^525^207^570,202223125^A_1^14^524^0^570,202223128^A_2^14^522^207^570,202223126^A_2^14^515^0^570,202223164^A_4Y6^14^491^0^575,202289429^A_Z^36^490^0^575,202223163^A_1Y2Y6^14^486^0^575,202223160^A_1^14^485^0^575,202223158^A_Z^14^483^0^575,202223159^A_Z^14^476^0^575,202223161^A_1^14^471^0^575,202223162^A_1Y2Y3^14^471^0^575,202289430^A_1^36^470^0^575,202223165^A_Z^14^464^207^575,202223166^A_1^14^458^207^575]",
              total: ranking,
              uri: "apidata/api/gkv3/recomScore/gufen_a",
              xktype: "1",
              zslx: "",
              signsafe: util.uuid(false),
            },
            headers: FAKE_HEADERS,
            timeout: 30000,
            validateStatus: () => true,
          }
        )
          .then(result => {
            checkResult(result);
            resolve(result)
          })
          .catch(() => {
            axios.post(
              "https://api.zjzw.cn/web/api/",
              {},
              {
                params: {
                  again: againSubjectIds.join(','),
                  local_province_id: provinceId,
                  page: "1",
                  preferred: preferredSubjectId,
                  recom: recomModeId || "0",
                  request_type: "1",
                  score,
                  section_level: "",
                  size: `${size || 20}`,
                  // top_school_id: "[770,431,138,1476,2498,1472,119,131,1404,108,504,1329]",
                  total: ranking,
                  uri: "apidata/api/gkv3/recomScore/gufen_b_special",
                  xktype: "1",
                  zslx: "",
                  signsafe: util.uuid(false),
                },
                headers: FAKE_HEADERS,
                timeout: 30000,
                validateStatus: () => true,
              }
            )
              .then(result => {
                checkResult(result);
                resolve(result)
              })
              .catch(() => {
                axios.post(
                  "https://api.zjzw.cn/web/api/",
                  {},
                  {
                    params: {
                      elective: `${preferredSubjectId},${againSubjectIds.join(',')}`,
                      local_province_id: provinceId,
                      page: "1",
                      recom: recomModeId || "0",
                      request_type: "1",
                      score,
                      section_level: "",
                      signsafe: util.uuid(false),
                      size: `${size || 20}`,
                      // top_school_id: "[138,3574,662,504,131,108]",
                      total: ranking,
                      uri: "apidata/api/gkv3/recomScore/gufen_a_special",
                      xktype: "1",
                      zslx: "",
                    },
                    headers: FAKE_HEADERS,
                    timeout: 30000,
                    validateStatus: () => true,
                  }
                )
                  .then(resolve)
                  .catch(reject);
              })
          })
      })
  }) as any;
  const {
    year,
    numFound: total,
    item: list
  } = checkResult(result);
  const details = universitesListSummarize(list);
  return `现在是${util.getDateString("yyyy年MM月dd日")}，您的分数（${score}分）在考试院${year}公布的省排名（同分最低排名）为${ranking || '[未知]'}名。\n\n系统推荐院校列表如下:\n\n${details}`;
}

/**
 * 获取推荐的大学信息（旧高考）
 * 
 * @param provinceId 高考地区ID
 * @param targetProvinceId 目标大学地区ID
 * @param subjectTypeId 学科类型ID
 * @param score 高考总分
 * @param size 推荐个数
 */
async function getRecommendedUniversitiesOld(
  provinceId: string,
  targetProvinceId: string | null,
  subjectTypeId: string,
  recomModeId: string,
  score: number,
  size?: number
) {
  const ranking = await getScoreRankingOld(provinceId, subjectTypeId, score)
  const result = await axios.post(
    "https://api.zjzw.cn/web/api/",
    {},
    {
      params: {
        local_province_id: provinceId,
        local_type_id: subjectTypeId,
        page: "1",
        province_id: targetProvinceId || "",
        recom: recomModeId || "0",
        request_type: "1",
        score,
        section_level: "",
        size: `${size || 20}`,
        // top_school_id: "[876,431,2498,270,481,3574,445,662,2836,1532,2491,1920,504,1927,131,2449,1404,419,108,1249,575,3254,463,834,884,466,878,458]",
        total: ranking,
        uri: "apidata/api/gkv3/recomScore/gufen",
        xktype: "1",
        zslx: "",
        signsafe: util.uuid(false),
      },
      headers: FAKE_HEADERS,
      timeout: 30000,
      validateStatus: () => true,
    }
  );
  const {
    year,
    numFound: total,
    item: list
  } = checkResult(result);
  const details = universitesListSummarize(list);
  return `现在是${util.getDateString("yyyy年MM月dd日")}，您的分数（${score}分）在考试院${year}公布的省排名（同分最低排名）为${ranking}名。\n\n系统推荐院校列表如下:\n\n${details}`;
}

/**
 * 精简数据为描述
 * 
 * @param list 数据列表
 */
function universitesListSummarize(list: any[]) {
  if (list.length == 0)
    return '此推荐方式下没有可推荐的院校，可以尝试其它的推荐方式：“冲刺”、“稳妥”、“保底”。';
  return list.reduce((str, item) => {
    let { school_id, name, nature_name, province_name, city_name, county_name, local_type_name, level_name, sg_name, sg_info, zslx_name, recom, risk } = item;
    if (!name && schools[school_id])
      name = schools[school_id].name
    return str + `名称：${name}
性质：${nature_name}
地区：${province_name} ${city_name} ${county_name}
类型：${local_type_name || '无数据'}
学历层次：${level_name}
专业组：${(sg_name || '无数据').replace(/（|）/g, '')}
选科要求：${sg_info || '无数据'}
招生类型：${zslx_name || '无数据'}
录取概率：${['0', '低', '中', '高'][risk]}（${recom}）\n\n`
  }, "");
}

/**
 * 是否旧高考地区
 * 
 * @param province 高考地区
 */
function isOldProvince(province: string) {
  for(let _province of OLD_GAOKAO_PROVINCE)
    if(province.includes(_province))
      return true;
  return false;
}

/**
 * 检查请求结果
 *
 * @param result 结果
 */
function checkResult(result: AxiosResponse) {
  if (!result.data) return null;
  const { code, message, msg, data, body } = result.data;
  if (!_.isFinite(code) && !_.isString(code)) return result.data;
  if (code === "0000") return data;
  if (code === 200) return body;
  throw new APIException(EX.API_REQUEST_FAILED, `[请求失败]: ${message || msg}`);
}

export default {
  getProvinceId,
  getSubjectId,
  getSubjectTypeId,
  getRecomModeId,
  searchMajors,
  searchUniversitys,
  getMajors,
  getMajorDetails,
  getRecommendedUniversities,
  getRecommendedUniversitiesOld,
  getScoreRanking,
  isOldProvince
};
