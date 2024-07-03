import _ from "lodash";

import Request from "@/lib/request/Request.ts";
import univSelection from "@/api/controllers/univ-selection.ts";

export default {
  prefix: "/univ_selection",

  post: {
  
    "/get_recommended_universities": async (request: Request) => {
      request
        .validate("body.province", _.isString, "高考地区有误，它一般是一个省份或直辖市、特区（如：广东）。")
        .validate("body.target_province", v => _.isUndefined(v) || _.isString(v), "target_province 参数有误，它必须是一个期望大学所在的地区，它一般是一个省份或直辖市、特区（如：广东）。")
        .validate("body.preferred_subject", _.isString, "首选科目错误，它必须是一个首选科目，首选科目必须为“物理”或“历史”，请让用户补充首选科目。如果用户高考地区在这些地区则需要更换调用旧高考的大学推荐工具：山西、内蒙古、河南、四川、云南、陕西、青海、宁夏")
        .validate("body.again_subject_one", _.isString, "再选科目1错误，它必须是“化学”、“生物”、“政治”、“地理”、“技术”其中之一，请让用户补充再选科目。")
        .validate("body.again_subject_two", _.isString, "再选科目2错误，它必须是“化学”、“生物”、“政治”、“地理”、“技术”其中之一，请让用户补充再选科目。")
        .validate("body.recom_mode", v => _.isUndefined(v) || _.isString(v), "推荐模式错误，他必须是“冲刺”、“稳妥”、“保底”其中之一，请询问用户的期望。")
        .validate("body.score", _.isFinite, "score 参数有误，它必须是一个分数数字")
        .validate("body.size", v => _.isUndefined(v) || _.isFinite(v));
      const {
        province,
        target_province: targetProvince,
        preferred_subject: preferredSubject,
        again_subject_one: againSubjectOne,
        again_subject_two: againSubjectTwo,
        recom_mode: recomMode,
        score,
        size
      } = request.body;
      console.log(request.body);
      if(score < 60)
        throw new Error(`分数太低了，请直接回复用户：“${score}分？我拿脚踩一下答题卡分数都比你高，可惜我没有脚”`);
      if(score > 750)
        throw new Error("分数已经超过高考满分，请直接回复用户：“年轻人不讲武德 。 来，骗！ 来，偷袭，我半岁的，GLM4老同志”");
      if(province == '')
        throw new Error("高考地区为空，它必须是一个高考地区，它一般是一个省份或直辖市、特区（如：广东）。");
      if(univSelection.isOldProvince(province))
        throw new Error("该地区暂未实行“新高考”标准，请要求提供学科类型（理科或文科）并使用旧高考的获取推荐大学列表工具");
      const provinceId = univSelection.getProvinceId(province);
      if (!provinceId)
        throw new Error("高考地区参数有误，它必须是一个高考地区，它一般是一个省份或直辖市、特区（如：广东）。");
      let targetProvinceId;
      if(targetProvince) {
        targetProvinceId = univSelection.getProvinceId(targetProvince);
        if (!targetProvinceId)
          throw new Error("期望大学所在的地区参数有误，它必须是一个期望大学所在的地区，它一般是一个省份或直辖市、特区（如：广东）。");
      }
      if(preferredSubject == '')
        throw new Error("首选科目为空，它必须为“物理”或者“历史”之一。");
      const preferredSubjectId = univSelection.getSubjectId(preferredSubject);
      if (!preferredSubjectId)
        throw new Error("首选科目参数有误，它必须是一个首选科目，首选科目必须为“物理”或者“历史”之一。");
      if(againSubjectOne == '')
        throw new Error("再选科目1为空，它必须为“化学”、“生物”、“政治”、“地理”、“技术”的其中之一，且不能与再选科目2相同，请让用户补充再选科目。");
      const againSubjectOneId = univSelection.getSubjectId(againSubjectOne);
      if (!againSubjectOneId)
        throw new Error("再选科目1参数有误，它必须是一个再选科目，再选科目必须为“化学”、“生物”、“政治”、“地理”、“技术”的其中之一，请让用户修改再选科目。");
        if(againSubjectTwo == '')
        throw new Error("再选科目2为空，它必须为“化学”、“生物”、“政治”、“地理”、“技术”的其中之一，且不能与再选科目1相同，请让用户补充再选科目。");
      const againSubjectTwoId = univSelection.getSubjectId(againSubjectTwo);
      if (!againSubjectTwoId)
        throw new Error("再选科目2参数有误，它必须是一个再选科目，再选科目必须为“化学”、“生物”、“政治”、“地理”、“技术”的其中之一，请让用户修改再选科目。");
      if(_.uniq([preferredSubjectId, againSubjectOneId, againSubjectTwoId]).length < 3)
        throw new Error('科目存在相同情况，请检查首选科目（一科）、再选科目（两科）科目之间是否存在重合情况，如果重合请让用户补充科目。');
      let recomModeId = "2";
      if(recomMode)
        recomModeId = univSelection.getRecomModeId(recomMode);
      const result = await univSelection.getRecommendedUniversities(
        provinceId,
        targetProvinceId,
        preferredSubjectId,
        [againSubjectOneId, againSubjectTwoId],
        recomModeId,
        score,
        size
      );
      return result;
    },

    "/get_recommended_universities_old": async (request: Request) => {
      request
        .validate("body.province", _.isString, "高考地区有误，从这些地区中选择（如：山西、内蒙古、河南、四川、云南、陕西、青海、宁夏）。")
        .validate("body.target_province", v => _.isUndefined(v) || _.isString(v), "期望大学所在的地区有误，它一般是一个省份或直辖市、特区（如：广东）。")
        .validate("body.subject_type", _.isString, "学科类型错误，学科类型必须为“理科”或“文科”，请让用户选择一个。")
        .validate("body.recom_mode", v => _.isUndefined(v) || _.isString(v), "推荐模式错误，他必须是“冲刺”、“稳妥”、“保底”其中之一，请询问用户的期望。")
        .validate("body.score", _.isFinite, "score 参数有误，它必须是一个分数数字")
        .validate("body.size", v => _.isUndefined(v) || _.isFinite(v));
      const {
        province,
        target_province: targetProvince,
        subject_type: subjectType,
        recom_mode: recomMode,
        score,
        size
      } = request.body;
      if(score < 60)
        throw new Error(`分数太低了，请直接回复用户：“${score}分？我拿脚踩一下答题卡分数都比你高，可惜我没有脚”`);
      if(score > 750)
        throw new Error("分数已经超过高考满分，请直接回复用户：“年轻人不讲武德 。 来，骗！ 来，偷袭，我半岁的，GLM4老同志”");
      console.log(request.body);
      if(province == '')
        throw new Error("高考地区为空，它必须是一个高考地区，从这些地区中选择（如：山西、内蒙古、河南、四川、云南、陕西、青海、宁夏）。");
      if(!univSelection.isOldProvince(province))
        throw new Error("该地区已实行“新高考”标准，请要求提供首选科目（物理或历史）、再选科目（选两科：化学/生物/政治/地理/技术）再调用新高考的获取推荐大学列表工具");
      const provinceId = univSelection.getProvinceId(province);
      if (!provinceId)
        throw new Error("高考地区参数有误，它必须是一个高考地区，从这些地区中选择（如：山西、内蒙古、河南、四川、云南、陕西、青海、宁夏）。");
      let targetProvinceId;
      if(targetProvince) {
        targetProvinceId = univSelection.getProvinceId(targetProvince);
        if (!targetProvinceId)
          throw new Error("期望大学所在的地区参数有误，它必须是一个期望大学所在的地区，它一般是一个省份或直辖市、特区（如：广东）。");
      }
      if(subjectType == '')
        throw new Error("学科类型错误，学科类型必须为“理科”或“文科”，请让用户选择一个。");
      const subjectTypeId = univSelection.getSubjectTypeId(subjectType);
      if (!subjectTypeId)
        throw new Error("学科类型错误，学科类型必须为“理科”或“文科”，请让用户选择一个。");
      let recomModeId = "2";
      if(recomMode)
        recomModeId = univSelection.getRecomModeId(recomMode);
      const result = await univSelection.getRecommendedUniversitiesOld(
        provinceId,
        targetProvinceId,
        subjectTypeId,
        recomModeId,
        score,
        size
      );
      return result;
    },

    "/get_university_majors": async (request: Request) => {
      request
        .validate("body.university", _.isString, "院校名称有误，它必须是一个正确的院校名称（如：珠海科技学院）")
      const {
        university
      } = request.body;
      console.log(request.body);
      const results = await univSelection.searchUniversitys(university);
      if(results.length == 0)
        return '未找到此院校名称，请让用户提供正确的院校名称供再次获取院校详情。';
      const foundUniversity = results[0];
      const schoolId = foundUniversity.school_id;
      const majorDetails = await univSelection.getMajors(schoolId);
      return majorDetails;
    },

    "/get_major_details": async (request: Request) => {
      request
        .validate("body.major", _.isString, "专业名称参数有误，它必须是一个专业名称（如：软件工程）")
      const {
        major
      } = request.body;
      console.log(request.body);
      if(major == '')
        throw new Error("专业名称为空，请让用户提供想咨询的专业名称");
      const results = await univSelection.searchMajors(major);
      if(results.length == 0)
        return '未找到此专业名称，请让用户提供正确的专业名称供再次获取专业详情。';
      // if(results.length > 0) {
      //   return `找到多个匹配的专业，请让用户从中选择一个，然后你将再次获取专业详情：\n\n${results.reduce((str, item) => {
      //     const { name, spcode, level1_name, limit_year, degree, fivesalaryavg, boy_rate, girl_rate } = item;
      //     return str + `名称：${name}\n专业层次：${level1_name}\n专业代码：${spcode}\n修业年限：${limit_year}\n授予学位：${degree || '无'}\n男女比例：${boy_rate || '未知'}:${girl_rate || '未知'}\n平均薪酬：￥${fivesalaryavg}\n\n`;
      //   }, "")}`;
      // }
      const foundMajor = results[0];
      const majorId = foundMajor.special_id;
      const majorDetails = await univSelection.getMajorDetails(majorId);
      return majorDetails;
    },

    "/get_major_admissions": async (request: Request) => {
      request
        .validate("body.major", _.isString, "专业名称有误，它必须是一个正确的专业名称（如：软件工程）。")
        .validate("body.province", _.isString, "高考地区有误，它必须是一个省份或直辖市、特区（如：广东）。")
        .validate("body.university", _.isString, "院校名称有误，它必须是一个院校名称（如：珠海科技学院）。");
      const {
        major,
        province,
        university
      } = request.body;
      console.log(request.body);
      const results = await univSelection.searchMajors(major);
      if(results.length == 0)
        return '未找到此专业名称，请让用户提供正确的专业名称供再次获取专业详情。';
      // if(results.length > 0) {
      //   return `找到多个匹配的专业，请让用户从中选择一个，然后你将再次获取专业详情：\n\n${results.reduce((str, item) => {
      //     const { name, spcode, level1_name, limit_year, degree, fivesalaryavg, boy_rate, girl_rate } = item;
      //     return str + `名称：${name}\n专业层次：${level1_name}\n专业代码：${spcode}\n修业年限：${limit_year}\n授予学位：${degree || '无'}\n男女比例：${boy_rate || '未知'}:${girl_rate || '未知'}\n平均薪酬：￥${fivesalaryavg}\n\n`;
      //   }, "")}`;
      // }
      const foundMajor = results[0];
      const majorId = foundMajor.special_id;
      let schoolId;
      const universitys = await univSelection.searchUniversitys(university);
      if(universitys.length > 0)
        schoolId = universitys[0].school_id;
      const majorDetails = await univSelection.getMajorDetails(majorId, schoolId, province);
      return majorDetails;
    },

    "/get_score_ranking": async (request: Request) => {
      request
        .validate("body.province", _.isString)
        .validate("body.preferred_subject", _.isString)
        .validate("body.score", _.isFinite);
      const {
        province,
        preferred_subject: preferredSubject,
        score,
      } = request.body;
      if(score < 60)
        throw new Error(`分数太低了，请直接回复用户：“${score}分？我拿脚踩一下答题卡分数都比你高，可惜我没有脚”`);
      if(score > 750)
        throw new Error("分数已经超过高考满分，请直接回复用户：“年轻人不讲武德 。 来，骗！ 来，偷袭，我半岁的，GLM4老同志”");
      console.log(request.body);
      const provinceId = univSelection.getProvinceId(province);
      if (!provinceId)
        throw new Error("province 参数有误，它必须是一个高考地区，它一般是一个省份名称（如：广东）。");
      const preferredSubjectId = univSelection.getSubjectId(preferredSubject);
      if (!preferredSubjectId)
        throw new Error("preferred_subjectc 参数有误，它必须是一个首选科目，首选科目必须为”物理“或者”历史“之一。");
      const ranking = await univSelection.getScoreRanking(
        provinceId,
        preferredSubjectId,
        score
      );
      return {
        ranking,
      };
    },

  },
};
