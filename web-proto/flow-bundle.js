"use strict";
var DasidaFlow = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // web-proto/flow-entry.ts
  var flow_entry_exports = {};
  __export(flow_entry_exports, {
    advanceFromCheck: () => advanceFromCheck,
    advanceFromChoice: () => advanceFromChoice,
    advanceFromExplain: () => advanceFromExplain,
    createDiagnosisFlowDraft: () => createDiagnosisFlowDraft,
    diagnosisMethodRoutingCatalog: () => diagnosisMethodRoutingCatalog,
    getDiagnosisFlow: () => getDiagnosisFlow,
    getNode: () => getNode,
    methodOptions: () => methodOptions
  });

  // data/diagnosisTree.ts
  var methodOptions = [
    { id: "cps", labelKo: "\uC644\uC804\uC81C\uACF1\uC2DD" },
    { id: "vertex", labelKo: "\uAF2D\uC9D3\uC810 \uACF5\uC2DD" },
    { id: "diff", labelKo: "\uBBF8\uBD84" },
    { id: "factoring", labelKo: "\uC778\uC218\uBD84\uD574" },
    { id: "quadratic", labelKo: "\uADFC\uC758 \uACF5\uC2DD" },
    { id: "radical", labelKo: "\uBB34\uB9AC\uC218 \uACC4\uC0B0" },
    { id: "polynomial", labelKo: "\uB2E4\uD56D\uC2DD \uC804\uAC1C" },
    { id: "complex_number", labelKo: "\uBCF5\uC18C\uC218 \uACC4\uC0B0" },
    { id: "remainder_theorem", labelKo: "\uB098\uBA38\uC9C0\uC815\uB9AC" },
    { id: "counting", labelKo: "\uACBD\uC6B0\uC758 \uC218" },
    { id: "set", labelKo: "\uC9D1\uD569 \uC5F0\uC0B0" },
    { id: "proposition", labelKo: "\uBA85\uC81C \uD310\uBCC4" },
    { id: "trig", labelKo: "\uC0BC\uAC01\uD568\uC218" },
    { id: "integral", labelKo: "\uC801\uBD84" },
    { id: "linear_eq", labelKo: "\uBD80\uB4F1\uC2DD\xB7\uD568\uC218" },
    { id: "sequence", labelKo: "\uC218\uC5F4" },
    { id: "log_exp", labelKo: "\uC9C0\uC218\xB7\uB85C\uADF8" },
    { id: "conic", labelKo: "\uC774\uCC28\uACE1\uC120" },
    { id: "limit", labelKo: "\uADF9\uD55C" },
    { id: "vector", labelKo: "\uBCA1\uD130" },
    { id: "probability", labelKo: "\uD655\uB960" },
    { id: "space_geometry", labelKo: "\uACF5\uAC04\uAE30\uD558" },
    { id: "function", labelKo: "\uD568\uC218" },
    { id: "statistics", labelKo: "\uD1B5\uACC4" },
    { id: "geometry", labelKo: "\uB3C4\uD615" },
    { id: "permutation", labelKo: "\uC21C\uC5F4\xB7\uC870\uD569" },
    { id: "sequence_limit", labelKo: "\uC218\uC5F4\uC758 \uADF9\uD55C" },
    { id: "integral_advanced", labelKo: "\uC2EC\uD654 \uC801\uBD84" },
    { id: "diff_advanced", labelKo: "\uC2EC\uD654 \uBBF8\uBD84" },
    { id: "trig_advanced", labelKo: "\uC2EC\uD654 \uC0BC\uAC01\uD568\uC218" },
    { id: "unknown", labelKo: "\uC798 \uBAA8\uB974\uACA0\uC5B4" }
  ];
  var diagnosisTree = {
    cps: {
      methodId: "cps",
      prompt: "\uC644\uC804\uC81C\uACF1\uC2DD \uD480\uC774\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "cps_formula",
          text: "4\uB97C \uB354\uD558\uACE0 \uBE7C\uB294 \uC644\uC804\uC81C\uACF1\uC2DD \uC6D0\uB9AC\uAC00 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "formula_understanding"
        },
        {
          id: "cps_calc",
          text: "\uC2DD \uBCC0\uD615\uC740 \uD588\uC9C0\uB9CC \uACC4\uC0B0\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "calc_repeated_error"
        },
        {
          id: "cps_read",
          text: "\uC644\uC131 \uD6C4 \uCD5C\uC19F\uAC12 \uC77D\uB294 \uB2E8\uACC4\uAC00 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "min_value_read_confusion"
        }
      ]
    },
    vertex: {
      methodId: "vertex",
      prompt: "\uAF2D\uC9D3\uC810 \uACF5\uC2DD \uD480\uC774\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "vertex_formula",
          text: "-b/2a \uACF5\uC2DD \uC801\uC6A9\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "vertex_formula_memorization"
        },
        {
          id: "vertex_sub",
          text: "x\uB97C \uAD6C\uD55C \uB4A4 f(x) \uB300\uC785\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "calc_repeated_error"
        },
        {
          id: "vertex_coeff",
          text: "a, b, c \uACC4\uC218/\uBD80\uD638\uB97C \uC77D\uB294 \uAC8C \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "coefficient_sign_confusion"
        }
      ]
    },
    diff: {
      methodId: "diff",
      prompt: "\uBBF8\uBD84 \uD480\uC774\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "diff_rule",
          text: "\uBBF8\uBD84 \uACC4\uC0B0 \uADDC\uCE59 \uC801\uC6A9\uC5D0\uC11C \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "derivative_calculation"
        },
        {
          id: "diff_order",
          text: "f'(x)=0 \uC774\uD6C4 \uD480\uC774 \uC21C\uC11C\uAC00 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "solving_order_confusion"
        },
        {
          id: "diff_judge",
          text: "\uCD5C\uB313\uAC12/\uCD5C\uC19F\uAC12 \uD310\uB2E8\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "max_min_judgement_confusion"
        },
        {
          id: "g2_diff_application",
          text: "\uC99D\uAC10\uD45C \uC791\uC131 \uD6C4 \uCD5C\uB313\xB7\uCD5C\uC19F\uAC12 \uACB0\uC815\uC5D0\uC11C \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g2_diff_application"
        }
      ]
    },
    unknown: {
      methodId: "unknown",
      prompt: "\uD604\uC7AC \uC0C1\uD0DC\uC5D0 \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uC124\uBA85\uC744 \uACE8\uB77C\uC8FC\uC138\uC694.",
      choices: [
        {
          id: "unknown_basic",
          text: "\uD480\uC774 \uBC29\uBC95 \uC790\uCCB4\uB97C \uC544\uC9C1 \uC798 \uBAA8\uB974\uACA0\uC5B4\uC694.",
          weaknessId: "basic_concept_needed"
        },
        {
          id: "unknown_calc",
          text: "\uBC29\uD5A5\uC740 \uC54C\uACA0\uB294\uB370 \uACC4\uC0B0\uC5D0\uC11C \uC790\uC8FC \uD2C0\uB824\uC694.",
          weaknessId: "calc_repeated_error"
        },
        {
          id: "unknown_read",
          text: "\uCD5C\uC19F\uAC12/\uCD5C\uB313\uAC12 \uD574\uC11D\uC774 \uD5F7\uAC08\uB824\uC694.",
          weaknessId: "min_value_read_confusion"
        }
      ]
    },
    factoring: {
      methodId: "factoring",
      prompt: "\uC778\uC218\uBD84\uD574 \uD480\uC774\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "factoring_pattern",
          text: "\uC778\uC218\uBD84\uD574 \uACF5\uC2DD \uD328\uD134\uC744 \uB5A0\uC62C\uB9AC\uAE30 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "factoring_pattern_recall"
        },
        {
          id: "factoring_calc",
          text: "\uC778\uC218\uBD84\uD574\uB294 \uD588\uC9C0\uB9CC \uACC4\uC0B0\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "calc_repeated_error"
        },
        {
          id: "factoring_complex",
          text: "\uBCF5\uC7A1\uD55C \uC2DD\uC744 \uBB36\uB294 \uAC8C \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "complex_factoring_difficulty"
        }
      ]
    },
    quadratic: {
      methodId: "quadratic",
      prompt: "\uADFC\uC758 \uACF5\uC2DD \uD480\uC774\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "quadratic_formula",
          text: "\uADFC\uC758 \uACF5\uC2DD \uC790\uCCB4\uAC00 \uAE30\uC5B5\uC774 \uC548 \uB0AC\uC5B4\uC694.",
          weaknessId: "quadratic_formula_memorization"
        },
        {
          id: "quadratic_discriminant",
          text: "\uD310\uBCC4\uC2DD \uACC4\uC0B0\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "discriminant_calculation"
        },
        {
          id: "quadratic_simplify",
          text: "\uADFC\uC744 \uAD6C\uD55C \uB4A4 \uC815\uB9AC\uC5D0\uC11C \uD2C0\uB838\uC5B4\uC694.",
          weaknessId: "calc_repeated_error"
        }
      ]
    },
    radical: {
      methodId: "radical",
      prompt: "\uBB34\uB9AC\uC218 \uACC4\uC0B0\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "radical_simplify",
          text: "\u221A\uB97C \uAC04\uC18C\uD654\uD558\uAC70\uB098 \uBB36\uB294 \uB2E8\uACC4\uAC00 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "radical_simplification_error"
        },
        {
          id: "radical_rationalize",
          text: "\uBD84\uBAA8 \uC720\uB9AC\uD654 \uACFC\uC815\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "rationalization_error"
        },
        {
          id: "radical_calc",
          text: "\uBCC0\uD615 \uD6C4 \uB367\uC148/\uBE84\uC148\uC5D0\uC11C \uACC4\uC0B0 \uC2E4\uC218\uB97C \uD588\uC5B4\uC694.",
          weaknessId: "calc_repeated_error"
        },
        {
          id: "g2_radical_simplify",
          text: "\uADFC\uD638 \uC548 \uC218\uB97C \uAC04\uC18C\uD654\uD558\uB294 \uB2E8\uACC4\uAC00 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g2_radical_simplify"
        },
        {
          id: "g2_radical_rationalize",
          text: "\uCF24\uB808\uC2DD\uC73C\uB85C \uC720\uB9AC\uD654\uD558\uB294 \uACC4\uC0B0\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "g2_radical_rationalize"
        }
      ]
    },
    polynomial: {
      methodId: "polynomial",
      prompt: "\uB2E4\uD56D\uC2DD \uC804\uAC1C/\uC815\uB9AC\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "polynomial_sign",
          text: "\uC804\uAC1C \uACFC\uC815\uC5D0\uC11C \uBD80\uD638 \uC2E4\uC218\uB97C \uD588\uC5B4\uC694.",
          weaknessId: "expansion_sign_error"
        },
        {
          id: "polynomial_like_terms",
          text: "\uB3D9\uB958\uD56D\uC744 \uC815\uB9AC\uD558\uB294 \uB2E8\uACC4\uC5D0\uC11C \uD2C0\uB838\uC5B4\uC694.",
          weaknessId: "like_terms_error"
        },
        {
          id: "polynomial_calc",
          text: "\uC804\uAC1C \uC790\uCCB4\uB294 \uD588\uC9C0\uB9CC \uACC4\uC0B0\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "calc_repeated_error"
        },
        {
          id: "g2_poly_factoring",
          text: "\uACE0\uCC28 \uB2E4\uD56D\uC2DD \uC778\uC218\uBD84\uD574 \uD328\uD134\uC774 \uC548 \uB5A0\uC62C\uB790\uC5B4\uC694.",
          weaknessId: "g2_poly_factoring"
        },
        {
          id: "g2_poly_remainder",
          text: "\uB098\uBA38\uC9C0\uC815\uB9AC\uB97C \uC5B4\uB514\uC5D0 \uC5B4\uB5BB\uAC8C \uC4F0\uB294\uC9C0 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g2_poly_remainder"
        }
      ]
    },
    complex_number: {
      methodId: "complex_number",
      prompt: "\uBCF5\uC18C\uC218 \uACC4\uC0B0\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "complex_i_squared",
          text: "i\xB2 = -1 \uC801\uC6A9\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "imaginary_unit_confusion"
        },
        {
          id: "complex_expand",
          text: "\uC804\uAC1C \uD6C4 \uC2E4\uC218\uBD80/\uD5C8\uC218\uBD80 \uC815\uB9AC\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "complex_calc_error"
        },
        {
          id: "complex_calc",
          text: "\uACC4\uC0B0 \uC790\uCCB4\uC5D0\uC11C \uBD80\uD638\uB098 \uACF1\uC148 \uC2E4\uC218\uB97C \uD588\uC5B4\uC694.",
          weaknessId: "calc_repeated_error"
        }
      ]
    },
    remainder_theorem: {
      methodId: "remainder_theorem",
      prompt: "\uB098\uBA38\uC9C0\uC815\uB9AC \uD480\uC774\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "remainder_sub",
          text: "\uB098\uB217\uAC12\uC744 \uB300\uC785\uD558\uB294 \uB2E8\uACC4\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "remainder_substitution_error"
        },
        {
          id: "remainder_system",
          text: "\uC870\uAC74 \uB450 \uAC1C\uB85C \uC5F0\uB9BD\uBC29\uC815\uC2DD\uC744 \uC138\uC6B0\uB294 \uAC8C \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "simultaneous_equation_error"
        },
        {
          id: "remainder_calc",
          text: "\uD480\uC774 \uBC29\uD5A5\uC740 \uB9DE\uC9C0\uB9CC \uACC4\uC0B0\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "calc_repeated_error"
        }
      ]
    },
    counting: {
      methodId: "counting",
      prompt: "\uACBD\uC6B0\uC758 \uC218 \uD480\uC774\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "counting_method",
          text: "\uC5B4\uB5A4 \uBC29\uBC95(\uC21C\uC5F4/\uC870\uD569/\uC218\uD615\uB3C4)\uC744 \uC368\uC57C \uD560\uC9C0 \uBAB0\uB790\uC5B4\uC694.",
          weaknessId: "counting_method_confusion"
        },
        {
          id: "counting_overcount",
          text: "\uC911\uBCF5\uC744 \uC81C\uB300\uB85C \uCC98\uB9AC\uD558\uC9C0 \uBABB\uD588\uC5B4\uC694.",
          weaknessId: "counting_overcounting"
        },
        {
          id: "counting_basic",
          text: "\uACBD\uC6B0\uC758 \uC218 \uAC1C\uB150 \uC790\uCCB4\uAC00 \uC544\uC9C1 \uBD80\uC871\uD574\uC694.",
          weaknessId: "basic_concept_needed"
        },
        {
          id: "g2_counting_method",
          text: "\uC21C\uC5F4\xB7\uC870\uD569\xB7\uACF1\xB7\uD569 \uC911 \uC5B4\uB290 \uBC29\uBC95\uC744 \uC368\uC57C \uD560\uC9C0 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g2_counting_method"
        },
        {
          id: "g2_counting_overcounting",
          text: "\uACB9\uCE58\uB294 \uACBD\uC6B0\uB97C \uC911\uBCF5\uC73C\uB85C \uC138\uAC70\uB098 \uBE60\uB728\uB838\uC5B4\uC694.",
          weaknessId: "g2_counting_overcounting"
        }
      ]
    },
    set: {
      methodId: "set",
      prompt: "\uC9D1\uD569 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "set_operation",
          text: "\uD569\uC9D1\uD569\xB7\uAD50\uC9D1\uD569 \uACC4\uC0B0\uC5D0\uC11C \uC6D0\uC18C\uB97C \uC798\uBABB \uC14C\uC5B4\uC694.",
          weaknessId: "g2_set_operation"
        },
        {
          id: "set_complement",
          text: "\uC5EC\uC9D1\uD569 \uBC94\uC704\uB97C \uC798\uBABB \uC7A1\uC558\uC5B4\uC694.",
          weaknessId: "g2_set_complement"
        },
        {
          id: "set_count",
          text: "n(A\u222AB) \uACF5\uC2DD\uC5D0\uC11C \uC911\uBCF5 \uC6D0\uC18C \uCC98\uB9AC\uAC00 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g2_set_count"
        }
      ]
    },
    proposition: {
      methodId: "proposition",
      prompt: "\uBA85\uC81C \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "prop_contrapositive",
          text: "\uC5ED\xB7\uC774\xB7\uB300\uC6B0 \uC911 \uC5B4\uB290 \uAC83\uC778\uC9C0 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g2_prop_contrapositive"
        },
        {
          id: "prop_necessary_sufficient",
          text: "\uD544\uC694\uC870\uAC74\xB7\uCDA9\uBD84\uC870\uAC74 \uAD6C\uBD84\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g2_prop_necessary_sufficient"
        },
        {
          id: "prop_quantifier",
          text: '"\uBAA8\uB4E0"\uACFC "\uC5B4\uB5A4" \uBA85\uC81C \uD310\uB2E8\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.',
          weaknessId: "g2_prop_quantifier"
        }
      ]
    },
    trig: {
      methodId: "trig",
      prompt: "\uC0BC\uAC01\uD568\uC218 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "trig_unit_circle",
          text: "\uB2E8\uC704\uC6D0\uC5D0\uC11C sin\u03B8\xB7cos\u03B8 \uAC12\uC744 \uC77D\uB294 \uAC8C \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g2_trig_unit_circle"
        },
        {
          id: "trig_equation_range",
          text: "\uC0BC\uAC01\uBC29\uC815\uC2DD\uC758 \uD574 \uBC94\uC704\uB97C \uC798\uBABB \uC124\uC815\uD588\uC5B4\uC694.",
          weaknessId: "g2_trig_equation_range"
        },
        {
          id: "trig_identity",
          text: "\uC0BC\uAC01\uD568\uC218 \uD56D\uB4F1\uC2DD \uC801\uC6A9\uC5D0\uC11C \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g2_trig_identity"
        }
      ]
    },
    integral: {
      methodId: "integral",
      prompt: "\uC801\uBD84 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "integral_basic",
          text: "\uBD80\uC815\uC801\uBD84 \uACF5\uC2DD \uC801\uC6A9\uC5D0\uC11C \uC2E4\uC218\uD588\uC5B4\uC694.",
          weaknessId: "g2_integral_basic"
        },
        {
          id: "integral_definite",
          text: "F(b)-F(a) \uACC4\uC0B0\uC5D0\uC11C \uB05D\uAC12 \uB300\uC785\uC744 \uC798\uBABB\uD588\uC5B4\uC694.",
          weaknessId: "g2_integral_definite"
        },
        {
          id: "integral_diff",
          text: "\uC801\uBD84\uBCF4\uB2E4 \uBBF8\uBD84 \uD65C\uC6A9(\uCD5C\uB313\xB7\uCD5C\uC19F\uAC12) \uB2E8\uACC4\uC5D0\uC11C \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g2_diff_application"
        }
      ]
    },
    linear_eq: {
      methodId: "linear_eq",
      prompt: "\uBD80\uB4F1\uC2DD\xB7\uD568\uC218 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "linear_eq_range",
          text: "\uC774\uCC28\uBD80\uB4F1\uC2DD \uD574\uC758 \uBC94\uC704\uB97C \uBC18\uB300\uB85C \uC37C\uC5B4\uC694.",
          weaknessId: "g2_inequality_range"
        },
        {
          id: "linear_eq_domain",
          text: "\uD568\uC218\uC758 \uC815\uC758\uC5ED\xB7\uCE58\uC5ED \uC124\uC815\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g2_function_domain"
        },
        {
          id: "linear_eq_setup",
          text: "\uC870\uAC74\uC744 \uBC29\uC815\uC2DD\xB7\uBD80\uB4F1\uC2DD\uC73C\uB85C \uC138\uC6B0\uB294 \uB2E8\uACC4\uAC00 \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g2_eq_setup"
        }
      ]
    },
    sequence: {
      methodId: "sequence",
      prompt: "\uC218\uC5F4 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uB9C9\uD614\uB098\uC694?",
      choices: [
        {
          id: "seq_general",
          text: "\uC77C\uBC18\uD56D a\u2099 \uACF5\uC2DD(\uB4F1\uCC28\xB7\uB4F1\uBE44)\uC744 \uC5B4\uB514\uC5D0 \uC368\uC57C \uD560\uC9C0 \uBAB0\uB790\uC5B4\uC694.",
          weaknessId: "g3_sequence"
        },
        {
          id: "seq_sum",
          text: "\uD569 S\u2099 \uACF5\uC2DD \uC801\uC6A9 \uBC29\uBC95\uC5D0\uC11C \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_sequence"
        },
        {
          id: "seq_recurrence",
          text: "\uC810\uD654\uC2DD\uC744 \uC138\uC6B0\uAC70\uB098 \uC77C\uBC18\uD56D\uC73C\uB85C \uBC14\uAFB8\uB294 \uBC29\uBC95\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_sequence"
        }
      ]
    },
    log_exp: {
      methodId: "log_exp",
      prompt: "\uC9C0\uC218\xB7\uB85C\uADF8 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uC11C \uB9C9\uD614\uB098\uC694?",
      choices: [
        {
          id: "log_law",
          text: "\uB85C\uADF8 \uC131\uC9C8(\uB367\uC148\xB7\uBE84\uC148\xB7\uC9C0\uC218 \uBCC0\uD658) \uC801\uC6A9\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_log_exp"
        },
        {
          id: "exp_law",
          text: "\uC9C0\uC218 \uBC95\uCE59 \uBCC0\uD658\uC774\uB098 \uBC11 \uD1B5\uC77C\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_log_exp"
        },
        {
          id: "log_eq",
          text: "\uC9C0\uC218\uBC29\uC815\uC2DD\xB7\uB85C\uADF8\uBC29\uC815\uC2DD\uC73C\uB85C \uBCC0\uD658\uD574\uC11C \uD478\uB294 \uD750\uB984\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_log_exp"
        }
      ]
    },
    conic: {
      methodId: "conic",
      prompt: "\uC774\uCC28\uACE1\uC120 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "conic_std",
          text: "\uD3EC\uBB3C\uC120\xB7\uD0C0\uC6D0\xB7\uC30D\uACE1\uC120 \uD45C\uC900\uD615\uC744 \uC5B4\uB5BB\uAC8C \uC4F0\uB294\uC9C0 \uBAB0\uB790\uC5B4\uC694.",
          weaknessId: "g3_conic"
        },
        {
          id: "conic_focus",
          text: "\uCD08\uC810\uC774\uB098 \uC810\uADFC\uC120 \uACF5\uC2DD\uC774 \uAE30\uC5B5\uB098\uC9C0 \uC54A\uC558\uC5B4\uC694.",
          weaknessId: "g3_conic"
        },
        {
          id: "conic_setup",
          text: "\uC870\uAC74\uC744 \uC774\uCC28\uACE1\uC120 \uC2DD\uC73C\uB85C \uC138\uC6B0\uB294 \uACFC\uC815\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_conic"
        }
      ]
    },
    limit: {
      methodId: "limit",
      prompt: "\uADF9\uD55C \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uC11C \uB9C9\uD614\uB098\uC694?",
      choices: [
        {
          id: "lim_zero",
          text: "0/0 \uAF34\uC774 \uB098\uC654\uC744 \uB54C \uC5B4\uB5BB\uAC8C \uCC98\uB9AC\uD560\uC9C0 \uBAB0\uB790\uC5B4\uC694.",
          weaknessId: "g3_limit"
        },
        {
          id: "lim_factor",
          text: "\uC778\uC218\uBD84\uD574\uB85C \uACF5\uD1B5\uC778\uC218\uB97C \uC57D\uBD84\uD558\uB294 \uACFC\uC815\uC774 \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_limit"
        },
        {
          id: "lim_inf",
          text: "\u221E/\u221E \uAF34\uC5D0\uC11C \uCD5C\uACE0\uCC28\uD56D\uC73C\uB85C \uB098\uB204\uB294 \uCC98\uB9AC\uAC00 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_limit"
        }
      ]
    },
    vector: {
      methodId: "vector",
      prompt: "\uBCA1\uD130 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "vec_calc",
          text: "\uB450 \uBCA1\uD130\uC758 \uB367\uC148\xB7\uBE84\uC148\xB7\uD06C\uAE30 \uACC4\uC0B0\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_vector"
        },
        {
          id: "vec_dot",
          text: "\uB0B4\uC801 \uACC4\uC0B0\uC774\uB098 \uACF5\uC2DD \uC801\uC6A9\uC774 \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_vector"
        },
        {
          id: "vec_setup",
          text: "\uBCA1\uD130\uB85C \uB3C4\uD615 \uC870\uAC74\uC744 \uC2DD\uC73C\uB85C \uC138\uC6B0\uB294 \uACFC\uC815\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_vector"
        }
      ]
    },
    probability: {
      methodId: "probability",
      prompt: "\uD655\uB960 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uB9C9\uD614\uB098\uC694?",
      choices: [
        {
          id: "prob_conditional",
          text: "\uC870\uAC74\uBD80\uD655\uB960 P(A|B) \uACF5\uC2DD \uC801\uC6A9\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_probability"
        },
        {
          id: "prob_independent",
          text: "\uB3C5\uB9BD\xB7\uC885\uC18D \uC0AC\uAC74 \uD310\uB2E8\uC774\uB098 \uACF1\uC758 \uBC95\uCE59\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_probability"
        },
        {
          id: "prob_complement",
          text: "\uC5EC\uC0AC\uAC74\uC744 \uD65C\uC6A9\uD574 \uACC4\uC0B0\uD558\uB294 \uBC29\uBC95\uC744 \uBAB0\uB790\uC5B4\uC694.",
          weaknessId: "g3_probability"
        }
      ]
    },
    space_geometry: {
      methodId: "space_geometry",
      prompt: "\uACF5\uAC04\uAE30\uD558 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "sg_projection",
          text: "\uC815\uC0AC\uC601\uC774\uB098 \uB450 \uD3C9\uBA74\uC774 \uC774\uB8E8\uB294 \uAC01 \uACC4\uC0B0\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_space_geometry"
        },
        {
          id: "sg_relation",
          text: "\uC9C1\uC120\uACFC \uD3C9\uBA74\uC758 \uC704\uCE58 \uAD00\uACC4 \uD30C\uC545\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_space_geometry"
        },
        {
          id: "sg_coord",
          text: "\uACF5\uAC04\uB3C4\uD615\uC744 \uC88C\uD45C\uB85C \uC124\uC815\uD558\uB294 \uBC29\uBC95\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_space_geometry"
        }
      ]
    },
    function: {
      methodId: "function",
      prompt: "\uD568\uC218 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "fn_inverse",
          text: "\uC5ED\uD568\uC218\uB098 \uD569\uC131\uD568\uC218\uB97C \uAD6C\uD558\uB294 \uBC29\uBC95\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_function"
        },
        {
          id: "fn_condition",
          text: "\uC804\uC0AC\xB7\uB2E8\uC0AC \uC870\uAC74 \uD310\uB2E8\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_function"
        },
        {
          id: "fn_graph",
          text: "\uADF8\uB798\uD504\uC5D0\uC11C \uC870\uAC74\uC744 \uC77D\uC5B4\uB0B4\uB294 \uACFC\uC815\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_function"
        }
      ]
    },
    statistics: {
      methodId: "statistics",
      prompt: "\uD1B5\uACC4 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uB9C9\uD614\uB098\uC694?",
      choices: [
        {
          id: "stat_normalize",
          text: "\uC815\uADDC\uBD84\uD3EC \uD45C\uC900\uD654 Z=(X-\u03BC)/\u03C3 \uACFC\uC815\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_statistics"
        },
        {
          id: "stat_binomial",
          text: "\uC774\uD56D\uBD84\uD3EC \uACF5\uC2DD(\uD3C9\uADE0 np, \uBD84\uC0B0 npq) \uC801\uC6A9\uC774 \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_statistics"
        },
        {
          id: "stat_table",
          text: "\uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uD45C\uC5D0\uC11C \uD655\uB960\uAC12\uC744 \uC77D\uB294 \uBC29\uBC95\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_statistics"
        }
      ]
    },
    geometry: {
      methodId: "geometry",
      prompt: "\uB3C4\uD615 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "geo_pythagorean",
          text: "\uD53C\uD0C0\uACE0\uB77C\uC2A4 \uC815\uB9AC\uB97C \uC5B4\uB5A4 \uC0BC\uAC01\uD615\uC5D0 \uC801\uC6A9\uD560\uC9C0 \uBAB0\uB790\uC5B4\uC694.",
          weaknessId: "g1_geometry"
        },
        {
          id: "geo_auxiliary",
          text: "\uBCF4\uC870\uC120\uC744 \uC5B4\uB514\uC5D0 \uADF8\uC5B4\uC57C \uD560\uC9C0 \uBAB0\uB790\uC5B4\uC694.",
          weaknessId: "g1_geometry"
        },
        {
          id: "geo_trig",
          text: "\uC0BC\uAC01\uBE44\uB85C \uBCC0\uC758 \uAE38\uC774\uB97C \uAD6C\uD558\uB294 \uBC29\uBC95\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g1_geometry"
        }
      ]
    },
    permutation: {
      methodId: "permutation",
      prompt: "\uC21C\uC5F4\xB7\uC870\uD569 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uB9C9\uD614\uB098\uC694?",
      choices: [
        {
          id: "perm_choice",
          text: "\uC21C\uC5F4\uACFC \uC870\uD569 \uC911 \uC5B4\uB290 \uAC83\uC744 \uC368\uC57C \uD560\uC9C0 \uD310\uB2E8\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_counting"
        },
        {
          id: "perm_restrict",
          text: "\uC911\uBCF5 \uD5C8\uC6A9\xB7\uC81C\uD55C \uC870\uAC74 \uCC98\uB9AC\uAC00 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_counting"
        },
        {
          id: "perm_special",
          text: "\uC6D0\uC21C\uC5F4\uC774\uB098 \uAC19\uC740 \uAC83\uC774 \uC788\uB294 \uC21C\uC5F4 \uACF5\uC2DD\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_counting"
        }
      ]
    },
    sequence_limit: {
      methodId: "sequence_limit",
      prompt: "\uC218\uC5F4\uC758 \uADF9\uD55C \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uB9C9\uD614\uB098\uC694?",
      choices: [
        {
          id: "sl_converge",
          text: "\uC218\uC5F4\uC774 \uC218\uB834\uD558\uB294\uC9C0 \uBC1C\uC0B0\uD558\uB294\uC9C0 \uD310\uB2E8\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_limit"
        },
        {
          id: "sl_inf",
          text: "\u221E/\u221E \uAF34\uC5D0\uC11C \uADF9\uD55C\uAC12\uC744 \uAD6C\uD558\uB294 \uCC98\uB9AC\uAC00 \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_limit"
        },
        {
          id: "sl_geom",
          text: "\uB4F1\uBE44\uC218\uC5F4 \uADF9\uD55C \uC870\uAC74(|r|<1\uC774\uBA74 \uC218\uB834)\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_limit"
        }
      ]
    },
    integral_advanced: {
      methodId: "integral_advanced",
      prompt: "\uC801\uBD84 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "ia_substitution",
          text: "\uCE58\uD658\uC801\uBD84\xB7\uBD80\uBD84\uC801\uBD84\uC744 \uC5B4\uB514\uC5D0 \uC368\uC57C \uD560\uC9C0 \uBAB0\uB790\uC5B4\uC694.",
          weaknessId: "g3_integral"
        },
        {
          id: "ia_area",
          text: "\uC815\uC801\uBD84\uC73C\uB85C \uB113\uC774 \uACC4\uC0B0\uD560 \uB54C \uC808\uB313\uAC12 \uCC98\uB9AC\uAC00 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_integral"
        },
        {
          id: "ia_ftc",
          text: "\u222Bf(t)dt\uB97C \uBBF8\uBD84\uD558\uB294 \uAD00\uACC4\uC2DD \uD65C\uC6A9\uC774 \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_integral"
        }
      ]
    },
    diff_advanced: {
      methodId: "diff_advanced",
      prompt: "\uBBF8\uBD84 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "da_chain",
          text: "\uD569\uC131\uD568\uC218 \uBBF8\uBD84(chain rule) \uC801\uC6A9\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694.",
          weaknessId: "g3_diff"
        },
        {
          id: "da_extremum",
          text: "\uADF9\uAC12(\uCD5C\uB313\uAC12\xB7\uCD5C\uC19F\uAC12)\uC744 \uBBF8\uBD84\uC73C\uB85C \uCC3E\uB294 \uACFC\uC815\uC774 \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_diff"
        },
        {
          id: "da_tangent",
          text: "\uC811\uC120\uC758 \uBC29\uC815\uC2DD \uAD6C\uD558\uB294 \uBC29\uBC95\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_diff"
        }
      ]
    },
    trig_advanced: {
      methodId: "trig_advanced",
      prompt: "\uC0BC\uAC01\uD568\uC218 \uBB38\uC81C\uC5D0\uC11C \uC5B4\uB514\uAC00 \uAC00\uC7A5 \uC5B4\uB824\uC6E0\uB098\uC694?",
      choices: [
        {
          id: "ta_unit_circle",
          text: "\uB2E8\uC704\uC6D0\uC5D0\uC11C cos\u03B8\xB7sin\u03B8 \uC88C\uD45C\uB97C \uC77D\uB294 \uAC8C \uD5F7\uAC08\uB838\uC5B4\uC694.",
          weaknessId: "g3_trig"
        },
        {
          id: "ta_radius",
          text: "\uBC18\uC9C0\uB984\uC774 1\uC774 \uC544\uB2CC \uC6D0\uC5D0\uC11C sin\xB7cos \uAC12\uC744 \uAD6C\uD558\uB294 \uAC8C \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_trig"
        },
        {
          id: "ta_identity",
          text: "\uC0BC\uAC01\uD568\uC218 \uD56D\uB4F1\uC2DD(sin\xB2\u03B8+cos\xB2\u03B8=1) \uC801\uC6A9\uC5D0\uC11C \uB9C9\uD614\uC5B4\uC694.",
          weaknessId: "g3_trig"
        }
      ]
    }
  };

  // data/diagnosis-method-routing.ts
  var diagnosisMethodRoutingCatalog = {
    cps: {
      id: "cps",
      labelKo: "\uC644\uC804\uC81C\uACF1\uC2DD",
      summary: "\uC774\uCC28\uC2DD\uC744 \uC644\uC804\uC81C\uACF1\uC2DD \uD615\uD0DC\uB85C \uBCC0\uD615\uD558\uC5EC \uD478\uB294 \uBC29\uC2DD",
      keywords: ["\uC644\uC804\uC81C\uACF1", "\uC81C\uACF1\uC2DD", "\uBC18\uC758 \uC81C\uACF1", "\uB354\uD558\uACE0 \uBE7C", "\uBB36\uC5C8"],
      exampleUtterances: [
        "\uC644\uC804\uC81C\uACF1\uC2DD\uC73C\uB85C \uBB36\uC5B4\uC11C \uD482",
        "x\uACC4\uC218 \uBC18\uC758 \uC81C\uACF1\uC744 \uB354\uD558\uACE0 \uBE7C\uC11C \uB9CC\uB4E4\uC5C8\uC5B4\uC694"
      ],
      followupLabel: "\uC644\uC804\uC81C\uACF1\uC2DD\uC73C\uB85C \uBCC0\uD615"
    },
    vertex: {
      id: "vertex",
      labelKo: "\uAF2D\uC9D3\uC810 \uACF5\uC2DD",
      summary: "\uC774\uCC28\uD568\uC218\uC758 \uAF2D\uC9D3\uC810 \uACF5\uC2DD\uC744 \uC774\uC6A9\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uAF2D\uC9D3\uC810", "\uACF5\uC2DD", "-b/2a", "\uB300\uCE6D\uCD95", "\uCD95\uC758 \uBC29\uC815\uC2DD"],
      exampleUtterances: [
        "\uAF2D\uC9D3\uC810 \uACF5\uC2DD\uC73C\uB85C x\uC88C\uD45C\uB97C \uBA3C\uC800 \uAD6C\uD588\uC5B4\uC694",
        "-b/2a \uACF5\uC2DD\uC744 \uC368\uC11C \uB300\uC785\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uAF2D\uC9D3\uC810 \uACF5\uC2DD\uC744 \uC0AC\uC6A9"
    },
    diff: {
      id: "diff",
      labelKo: "\uBBF8\uBD84",
      summary: "\uD568\uC218\uB97C \uBBF8\uBD84\uD558\uC5EC \uADF9\uB313\uAC12\uC774\uB098 \uADF9\uC19F\uAC12\uC744 \uCC3E\uB294 \uBC29\uC2DD",
      keywords: ["\uBBF8\uBD84", "\uC811\uC120", "\uB3C4\uD568\uC218", "f'(x)", "\uADF9\uAC12", "\uAE30\uC6B8\uAE30 0"],
      exampleUtterances: [
        "\uBBF8\uBD84\uD574\uC11C f'(x)=0 \uB9CC\uB4E4\uC5C8\uC5B4\uC694",
        "\uB3C4\uD568\uC218 \uAD6C\uD574\uC11C 0 \uB418\uB294 \uC810 \uCC3E\uC558\uC5B4\uC694"
      ],
      followupLabel: "\uBBF8\uBD84\uC73C\uB85C \uADF9\uAC12\uC744 \uCC3E\uC74C"
    },
    factoring: {
      id: "factoring",
      labelKo: "\uC778\uC218\uBD84\uD574",
      summary: "\uB2E4\uD56D\uC2DD\uC744 \uC778\uC218\uBD84\uD574\uD558\uC5EC \uD574\uB97C \uAD6C\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uC778\uC218", "\uC778\uC218\uBD84\uD574", "\uBB36", "\uACF1\uC758 \uD615\uD0DC", "\uD06C\uB85C\uC2A4"],
      exampleUtterances: [
        "\uC778\uC218\uBD84\uD574 \uACF5\uC2DD\uC744 \uC368\uC11C \uBB36\uC5C8\uC5B4\uC694",
        "\uACF5\uD1B5\uC778\uC218\uB85C \uBB36\uC5B4\uC11C \uACC4\uC0B0\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uC778\uC218\uBD84\uD574\uB97C \uD65C\uC6A9\uD568"
    },
    quadratic: {
      id: "quadratic",
      labelKo: "\uADFC\uC758 \uACF5\uC2DD",
      summary: "\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uADFC\uC758 \uACF5\uC2DD\uC744 \uC0AC\uC6A9\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uADFC\uC758 \uACF5\uC2DD", "\uD310\uBCC4\uC2DD", "\uB8E8\uD2B8", "2a\uBD84\uC758"],
      exampleUtterances: [
        "\uBC14\uB85C \uADFC\uC758 \uACF5\uC2DD\uC5D0 \uB300\uC785\uD588\uC5B4\uC694",
        "\uC9DD\uC218 \uACF5\uC2DD \uC368\uC11C \uD574\uB97C \uAD6C\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uADFC\uC758 \uACF5\uC2DD\uC744 \uC0AC\uC6A9\uD568"
    },
    radical: {
      id: "radical",
      labelKo: "\uBB34\uB9AC\uC218 \uACC4\uC0B0",
      summary: "\uB8E8\uD2B8(\uBB34\uB9AC\uC218)\uAC00 \uD3EC\uD568\uB41C \uC2DD\uC744 \uACC4\uC0B0\uD558\uAC70\uB098 \uC720\uB9AC\uD654\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uB8E8\uD2B8", "\uBB34\uB9AC\uC218", "\uC720\uB9AC\uD654", "\uCF24\uB808", "\uC81C\uACF1\uADFC"],
      exampleUtterances: [
        "\uBD84\uBAA8 \uC720\uB9AC\uD654\uD558\uB2E4\uAC00 \uD5F7\uAC08\uB838\uC5B4\uC694",
        "\uB8E8\uD2B8 \uC548\uC758 \uC22B\uC790 \uBE7C\uB0B4\uB294 \uAC78 \uC2E4\uC218\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uBB34\uB9AC\uC218 \uACC4\uC0B0 \uBC0F \uC720\uB9AC\uD654"
    },
    polynomial: {
      id: "polynomial",
      labelKo: "\uB2E4\uD56D\uC2DD \uC804\uAC1C",
      summary: "\uB2E4\uD56D\uC2DD\uC744 \uC804\uAC1C\uD558\uC5EC \uB3D9\uB958\uD56D\uB07C\uB9AC \uC815\uB9AC\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uC804\uAC1C", "\uC804\uAC1C\uC2DD", "\uB3D9\uB958\uD56D", "\uD480\uC5B4\uC11C", "\uC804\uBD80 \uACF1"],
      exampleUtterances: [
        "\uC2DD\uC744 \uB2E4 \uC804\uAC1C\uD574\uC11C \uB3D9\uB958\uD56D\uB07C\uB9AC \uBB36\uC5C8\uC5B4\uC694",
        "\uC804\uAC1C \uACFC\uC815\uC5D0\uC11C \uBD80\uD638 \uC2E4\uC218\uB97C \uD588\uC5B4\uC694"
      ],
      followupLabel: "\uB2E4\uD56D\uC2DD\uC744 \uC804\uBD80 \uC804\uAC1C\uD568"
    },
    complex_number: {
      id: "complex_number",
      labelKo: "\uBCF5\uC18C\uC218 \uACC4\uC0B0",
      summary: "\uD5C8\uC218 \uB2E8\uC704 i\uAC00 \uD3EC\uD568\uB41C \uC2DD\uC744 \uACC4\uC0B0\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uBCF5\uC18C\uC218", "\uD5C8\uC218", "i", "\uC81C\uACF1\uD574\uC11C -1", "\uCF24\uB808\uBCF5\uC18C\uC218", "\uC2E4\uC218\uBD80", "\uD5C8\uC218\uBD80"],
      exampleUtterances: [
        "i\uC81C\uACF1\uC744 -1\uB85C \uBC14\uAFB8\uB294 \uAC78 \uAE4C\uBA39\uC5C8\uC5B4\uC694",
        "\uC2E4\uC218\uBD80 \uD5C8\uC218\uBD80 \uB530\uB85C \uB098\uB220\uC11C \uACC4\uC0B0\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uBCF5\uC18C\uC218 \uC131\uC9C8\uC744 \uC774\uC6A9\uD568"
    },
    remainder_theorem: {
      id: "remainder_theorem",
      labelKo: "\uB098\uBA38\uC9C0\uC815\uB9AC",
      summary: "\uB098\uBA38\uC9C0\uC815\uB9AC \uB610\uB294 \uC778\uC218\uC815\uB9AC\uB97C \uC774\uC6A9\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uB098\uBA38\uC9C0", "\uC778\uC218\uC815\uB9AC", "\uB300\uC785", "\uBAAB", "0\uC73C\uB85C \uB9CC\uB4DC\uB294"],
      exampleUtterances: [
        "\uB098\uBA38\uC9C0\uC815\uB9AC\uB85C x\uC5D0 \uD2B9\uC815 \uAC12\uC744 \uB300\uC785\uD588\uC5B4\uC694",
        "\uB098\uB204\uC5B4 \uB5A8\uC5B4\uC9C0\uB2C8\uAE4C \uC778\uC218\uC815\uB9AC \uC37C\uC5B4\uC694"
      ],
      followupLabel: "\uB098\uBA38\uC9C0/\uC778\uC218\uC815\uB9AC \uD65C\uC6A9"
    },
    counting: {
      id: "counting",
      labelKo: "\uACBD\uC6B0\uC758 \uC218",
      summary: "\uC21C\uC5F4, \uC870\uD569 \uB4F1\uC744 \uC774\uC6A9\uD574 \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uACBD\uC6B0", "\uACBD\uC6B0\uC758\uC218", "\uC21C\uC5F4", "\uC870\uD569", "\uBF51", "\uBC30\uC5F4", "\uC218\uD615\uB3C4", "\uB098\uC5F4"],
      exampleUtterances: [
        "\uC218\uD615\uB3C4\uB85C \uC77C\uC77C\uC774 \uB2E4 \uC14C\uC5B4\uC694",
        "\uC870\uD569 \uACF5\uC2DD \uC368\uC11C \uACC4\uC0B0\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uACBD\uC6B0\uC758 \uC218/\uD655\uB960 \uACC4\uC0B0"
    },
    unknown: {
      id: "unknown",
      labelKo: "\uC798 \uBAA8\uB974\uACA0\uC5B4",
      summary: "\uD480\uC774 \uBC29\uC2DD\uC744 \uD2B9\uC815\uD558\uAE30 \uC5B4\uB824\uC6B4 \uACBD\uC6B0",
      keywords: ["\uBAA8\uB974", "\uB9C9\uD614", "\uC5B4\uB5BB\uAC8C", "\uBB58 \uD574\uC57C", "\uAC10\uC774 \uC548"],
      exampleUtterances: [
        "\uC5B4\uB5BB\uAC8C \uC2DC\uC791\uD574\uC57C \uD560\uC9C0 \uBAA8\uB974\uACA0\uC5B4\uC694",
        "\uBB54\uAC00 \uD574\uBCF4\uAE34 \uD588\uB294\uB370 \uC911\uAC04\uBD80\uD130 \uB9C9\uD614\uC5B4\uC694"
      ],
      followupLabel: "\uC798 \uBAA8\uB974\uACA0\uC5B4\uC694"
    },
    set: {
      id: "set",
      labelKo: "\uC9D1\uD569 \uC5F0\uC0B0",
      summary: "\uC9D1\uD569\uC758 \uD569\uC9D1\uD569\xB7\uAD50\uC9D1\uD569\xB7\uC5EC\uC9D1\uD569 \uB4F1\uC744 \uC774\uC6A9\uD558\uC5EC \uD478\uB294 \uBC29\uC2DD",
      keywords: ["\uC9D1\uD569", "\uD569\uC9D1\uD569", "\uAD50\uC9D1\uD569", "\uC5EC\uC9D1\uD569", "\uC6D0\uC18C", "n(A"],
      exampleUtterances: [
        "\uC9D1\uD569 \uC5F0\uC0B0 \uACF5\uC2DD\uC744 \uC368\uC11C \uC6D0\uC18C \uAC1C\uC218\uB97C \uAD6C\uD588\uC5B4\uC694",
        "\uC5EC\uC9D1\uD569 \uBC94\uC704\uAC00 \uD5F7\uAC08\uB838\uC5B4\uC694"
      ],
      followupLabel: "\uC9D1\uD569 \uC5F0\uC0B0\uC744 \uC0AC\uC6A9\uD568"
    },
    proposition: {
      id: "proposition",
      labelKo: "\uBA85\uC81C \uD310\uBCC4",
      summary: "\uBA85\uC81C\uC758 \uCC38\xB7\uAC70\uC9D3 \uD310\uB2E8, \uC5ED\xB7\uC774\xB7\uB300\uC6B0, \uD544\uC694\xB7\uCDA9\uBD84\uC870\uAC74\uC744 \uB2E4\uB8E8\uB294 \uBC29\uC2DD",
      keywords: ["\uBA85\uC81C", "\uC5ED", "\uB300\uC6B0", "\uD544\uC694\uC870\uAC74", "\uCDA9\uBD84\uC870\uAC74", "\uCC38", "\uAC70\uC9D3", "\uBAA8\uB4E0", "\uC5B4\uB5A4"],
      exampleUtterances: [
        "\uC5ED\uACFC \uB300\uC6B0 \uC911 \uC5B4\uB290 \uAC83\uC744 \uC368\uC57C \uD560\uC9C0 \uD5F7\uAC08\uB838\uC5B4\uC694",
        "\uD544\uC694\uC870\uAC74 \uCDA9\uBD84\uC870\uAC74 \uAD6C\uBD84\uC774 \uC5B4\uB824\uC6E0\uC5B4\uC694"
      ],
      followupLabel: "\uBA85\uC81C \uCC38\xB7\uAC70\uC9D3 \uD310\uBCC4"
    },
    trig: {
      id: "trig",
      labelKo: "\uC0BC\uAC01\uD568\uC218",
      summary: "\uC0BC\uAC01\uD568\uC218 \uC815\uC758, \uB2E8\uC704\uC6D0, \uC0BC\uAC01\uBC29\uC815\uC2DD\xB7\uBD80\uB4F1\uC2DD\uC744 \uB2E4\uB8E8\uB294 \uBC29\uC2DD",
      keywords: ["\uC0BC\uAC01", "\uC0AC\uC778", "\uCF54\uC0AC\uC778", "\uD0C4\uC820\uD2B8", "sin", "cos", "tan", "\uB2E8\uC704\uC6D0", "\uB77C\uB514\uC548"],
      exampleUtterances: [
        "\uC0BC\uAC01\uBC29\uC815\uC2DD \uD574 \uBC94\uC704 \uC124\uC815\uC5D0\uC11C \uB9C9\uD614\uC5B4\uC694",
        "\uB2E8\uC704\uC6D0\uC5D0\uC11C \uAC12 \uC77D\uB294 \uAC8C \uD5F7\uAC08\uB838\uC5B4\uC694"
      ],
      followupLabel: "\uC0BC\uAC01\uD568\uC218 \uD65C\uC6A9"
    },
    integral: {
      id: "integral",
      labelKo: "\uC801\uBD84",
      summary: "\uBD80\uC815\uC801\uBD84\xB7\uC815\uC801\uBD84 \uACF5\uC2DD\uC744 \uC774\uC6A9\uD558\uC5EC \uD478\uB294 \uBC29\uC2DD",
      keywords: ["\uC801\uBD84", "\uBD80\uC815\uC801\uBD84", "\uC815\uC801\uBD84", "\uB113\uC774", "F(b)-F(a)", "\uC801\uBD84\uAD6C\uAC04"],
      exampleUtterances: [
        "\uC815\uC801\uBD84 \uACC4\uC0B0\uC5D0\uC11C \uB05D\uAC12 \uB300\uC785\uC744 \uC798\uBABB\uD588\uC5B4\uC694",
        "\uBD80\uC815\uC801\uBD84 \uACF5\uC2DD\uC774 \uC798 \uC548 \uB5A0\uC62C\uB790\uC5B4\uC694"
      ],
      followupLabel: "\uC801\uBD84\uC744 \uD65C\uC6A9\uD568"
    },
    linear_eq: {
      id: "linear_eq",
      labelKo: "\uBD80\uB4F1\uC2DD\xB7\uD568\uC218",
      summary: "\uC774\uCC28\uBD80\uB4F1\uC2DD\xB7\uD568\uC218\uC758 \uC815\uC758\uC5ED\xB7\uCE58\uC5ED\uC744 \uB2E4\uB8E8\uB294 \uBC29\uC2DD",
      keywords: ["\uBD80\uB4F1\uC2DD", "\uC815\uC758\uC5ED", "\uCE58\uC5ED", "\uBC94\uC704", "\uD568\uC218\uC2DD", "\uC774\uCC28\uBD80\uB4F1\uC2DD"],
      exampleUtterances: [
        "\uC774\uCC28\uBD80\uB4F1\uC2DD \uD574\uC758 \uBC94\uC704\uB97C \uBC18\uB300\uB85C \uC37C\uC5B4\uC694",
        "\uD568\uC218\uC758 \uC815\uC758\uC5ED \uC124\uC815\uC774 \uD5F7\uAC08\uB838\uC5B4\uC694"
      ],
      followupLabel: "\uBD80\uB4F1\uC2DD\xB7\uD568\uC218 \uC870\uAC74 \uD65C\uC6A9"
    },
    sequence: {
      id: "sequence",
      labelKo: "\uC218\uC5F4",
      summary: "\uB4F1\uCC28\xB7\uB4F1\uBE44\uC218\uC5F4 \uC77C\uBC18\uD56D\xB7\uD569 \uACF5\uC2DD \uB610\uB294 \uC810\uD654\uC2DD\uC73C\uB85C \uD478\uB294 \uBC29\uC2DD",
      keywords: ["\uC218\uC5F4", "\uB4F1\uCC28", "\uB4F1\uBE44", "\uC810\uD654\uC2DD", "\uC77C\uBC18\uD56D", "\uD569 \uACF5\uC2DD", "S\u2099", "\uC2DC\uADF8\uB9C8"],
      exampleUtterances: [
        "\uB4F1\uCC28\uC218\uC5F4 \uC77C\uBC18\uD56D\uC73C\uB85C a\u2099 \uAD6C\uD588\uC5B4\uC694",
        "\uC810\uD654\uC2DD\uC73C\uB85C \uC77C\uBC18\uD56D \uC720\uB3C4\uD588\uC5B4\uC694",
        "\uD569 \uACF5\uC2DD S\u2099 \uC368\uC11C \uACC4\uC0B0\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uC218\uC5F4 \uACF5\uC2DD\uC744 \uC801\uC6A9\uD568"
    },
    log_exp: {
      id: "log_exp",
      labelKo: "\uC9C0\uC218\xB7\uB85C\uADF8",
      summary: "\uC9C0\uC218\xB7\uB85C\uADF8 \uC131\uC9C8\uC744 \uC774\uC6A9\uD574 \uBC29\uC815\uC2DD\xB7\uBD80\uB4F1\uC2DD\uC744 \uD478\uB294 \uBC29\uC2DD",
      keywords: ["\uC9C0\uC218", "\uB85C\uADF8", "log", "\uBC11", "\uC9C0\uC218\uBC95\uCE59", "\uB85C\uADF8 \uC131\uC9C8", "\uBC29\uC815\uC2DD", "\uC0C1\uC6A9\uB85C\uADF8"],
      exampleUtterances: [
        "\uB85C\uADF8 \uC131\uC9C8\uB85C \uC2DD\uC744 \uBCC0\uD658\uD588\uC5B4\uC694",
        "\uC9C0\uC218\uBC95\uCE59\uC73C\uB85C \uBC11\uC744 \uD1B5\uC77C\uD588\uC5B4\uC694",
        "\uC591\uBCC0\uC5D0 \uB85C\uADF8 \uCDE8\uD574\uC11C \uC9C0\uC218\uBC29\uC815\uC2DD \uD480\uC5C8\uC5B4\uC694"
      ],
      followupLabel: "\uC9C0\uC218\xB7\uB85C\uADF8 \uC131\uC9C8\uC744 \uD65C\uC6A9\uD568"
    },
    conic: {
      id: "conic",
      labelKo: "\uC774\uCC28\uACE1\uC120",
      summary: "\uD3EC\uBB3C\uC120\xB7\uD0C0\uC6D0\xB7\uC30D\uACE1\uC120 \uD45C\uC900\uD615\uACFC \uCD08\uC810\xB7\uC810\uADFC\uC120\uC744 \uC774\uC6A9\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uD3EC\uBB3C\uC120", "\uD0C0\uC6D0", "\uC30D\uACE1\uC120", "\uCD08\uC810", "\uC810\uADFC\uC120", "\uC774\uCC28\uACE1\uC120", "\uD45C\uC900\uD615", "\uC900\uC120"],
      exampleUtterances: [
        "\uD0C0\uC6D0 \uD45C\uC900\uD615\uC73C\uB85C \uCD08\uC810 \uAD6C\uD588\uC5B4\uC694",
        "\uC30D\uACE1\uC120 \uC810\uADFC\uC120 \uACF5\uC2DD \uC37C\uC5B4\uC694",
        "\uD3EC\uBB3C\uC120 \uD45C\uC900\uD615\uC73C\uB85C \uAF2D\uC9D3\uC810 \uCC3E\uC558\uC5B4\uC694"
      ],
      followupLabel: "\uC774\uCC28\uACE1\uC120 \uD45C\uC900\uD615\uC744 \uD65C\uC6A9\uD568"
    },
    limit: {
      id: "limit",
      labelKo: "\uADF9\uD55C",
      summary: "0/0\xB7\u221E/\u221E \uBD80\uC815\uD615\uC744 \uC778\uC218\uBD84\uD574\xB7\uC720\uB9AC\uD654\uB85C \uCC98\uB9AC\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uADF9\uD55C", "lim", "0/0", "\uBB34\uD55C\uB300", "\uC778\uC218\uBD84\uD574", "\uBD80\uC815\uD615", "\uCD5C\uACE0\uCC28\uD56D", "\uC720\uB9AC\uD654"],
      exampleUtterances: [
        "0/0 \uAF34\uC744 \uC778\uC218\uBD84\uD574\uB85C \uC57D\uBD84\uD588\uC5B4\uC694",
        "\u221E/\u221E \uAF34\uC5D0\uC11C \uCD5C\uACE0\uCC28\uD56D\uC73C\uB85C \uB098\uB234\uC5B4\uC694",
        "\uBD84\uC790 \uC720\uB9AC\uD654\uD574\uC11C \uADF9\uD55C\uAC12 \uAD6C\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uADF9\uD55C\uAC12\uC744 \uACC4\uC0B0\uD568"
    },
    vector: {
      id: "vector",
      labelKo: "\uBCA1\uD130",
      summary: "\uBCA1\uD130\uC758 \uD569\xB7\uB0B4\uC801\xB7\uD06C\uAE30 \uACC4\uC0B0 \uB610\uB294 \uBCA1\uD130\uB85C \uB3C4\uD615 \uC870\uAC74\uC744 \uC2DD\uC73C\uB85C \uC138\uC6B0\uB294 \uBC29\uC2DD",
      keywords: ["\uBCA1\uD130", "\uB0B4\uC801", "\uD06C\uAE30", "\uBC29\uD5A5", "\uB2E8\uC704\uBCA1\uD130", "\uC704\uCE58\uBCA1\uD130", "\uC131\uBD84"],
      exampleUtterances: [
        "\uB450 \uBCA1\uD130\uC758 \uB0B4\uC801\uC744 \uAD6C\uD588\uC5B4\uC694",
        "\uBCA1\uD130\uC758 \uD06C\uAE30\uB85C \uC870\uAC74\uC744 \uC138\uC6E0\uC5B4\uC694",
        "\uC704\uCE58\uBCA1\uD130\uB85C \uC88C\uD45C\uB97C \uAD6C\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uBCA1\uD130 \uC5F0\uC0B0\uC744 \uD65C\uC6A9\uD568"
    },
    probability: {
      id: "probability",
      labelKo: "\uD655\uB960",
      summary: "\uC870\uAC74\uBD80\uD655\uB960, \uB3C5\uB9BD\xB7\uC885\uC18D \uC0AC\uAC74, \uC5EC\uC0AC\uAC74\uC744 \uC774\uC6A9\uD558\uC5EC \uD655\uB960\uC744 \uAD6C\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uD655\uB960", "\uC870\uAC74\uBD80\uD655\uB960", "\uB3C5\uB9BD", "\uC5EC\uC0AC\uAC74", "\uACBD\uC6B0\uC758 \uC218", "P(A)"],
      exampleUtterances: [
        "\uC870\uAC74\uBD80\uD655\uB960 \uACF5\uC2DD\uC73C\uB85C P(A|B)\uB97C \uAD6C\uD588\uC5B4\uC694",
        "\uC5EC\uC0AC\uAC74\uC744 \uC774\uC6A9\uD574\uC11C \uACC4\uC0B0\uD588\uC5B4\uC694",
        "\uB3C5\uB9BD \uC0AC\uAC74 \uACF1\uC758 \uBC95\uCE59\uC744 \uC37C\uC5B4\uC694"
      ],
      followupLabel: "\uD655\uB960 \uACF5\uC2DD\uC744 \uC801\uC6A9\uD568"
    },
    space_geometry: {
      id: "space_geometry",
      labelKo: "\uACF5\uAC04\uAE30\uD558",
      summary: "\uACF5\uAC04\uC5D0\uC11C \uC9C1\uC120\xB7\uD3C9\uBA74\uC758 \uC704\uCE58 \uAD00\uACC4, \uC815\uC0AC\uC601, \uC774\uBA74\uAC01\uC744 \uB2E4\uB8E8\uB294 \uBC29\uC2DD",
      keywords: ["\uACF5\uAC04", "\uC815\uC0AC\uC601", "\uD3C9\uBA74", "\uC9C1\uC120", "\uC774\uBA74\uAC01", "\uC218\uC120", "\uC88C\uD45C\uACF5\uAC04"],
      exampleUtterances: [
        "\uC815\uC0AC\uC601\uC73C\uB85C \uB450 \uD3C9\uBA74\uC774 \uC774\uB8E8\uB294 \uAC01\uC744 \uAD6C\uD588\uC5B4\uC694",
        "\uC9C1\uC120\uACFC \uD3C9\uBA74\uC758 \uC704\uCE58 \uAD00\uACC4\uB97C \uB530\uC838\uBD24\uC5B4\uC694",
        "\uACF5\uAC04\uC88C\uD45C\uB97C \uC124\uC815\uD574\uC11C \uD480\uC5C8\uC5B4\uC694"
      ],
      followupLabel: "\uACF5\uAC04\uAE30\uD558 \uC131\uC9C8\uC744 \uD65C\uC6A9\uD568"
    },
    function: {
      id: "function",
      labelKo: "\uD568\uC218",
      summary: "\uC5ED\uD568\uC218\xB7\uD569\uC131\uD568\uC218, \uC804\uC0AC\xB7\uB2E8\uC0AC \uC870\uAC74, \uADF8\uB798\uD504 \uBD84\uC11D\uC73C\uB85C \uD478\uB294 \uBC29\uC2DD",
      keywords: ["\uC5ED\uD568\uC218", "\uD569\uC131\uD568\uC218", "\uC804\uC0AC", "\uB2E8\uC0AC", "\uC815\uC758\uC5ED", "\uCE58\uC5ED", "\uD568\uC218 \uC870\uAC74"],
      exampleUtterances: [
        "\uC5ED\uD568\uC218\uB97C \uAD6C\uD574\uC11C \uB300\uC785\uD588\uC5B4\uC694",
        "\uD569\uC131\uD568\uC218 (f\u2218g)(x)\uB97C \uACC4\uC0B0\uD588\uC5B4\uC694",
        "\uC804\uC0AC \uB2E8\uC0AC \uC870\uAC74\uC744 \uD655\uC778\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uD568\uC218 \uC131\uC9C8\uC744 \uBD84\uC11D\uD568"
    },
    statistics: {
      id: "statistics",
      labelKo: "\uD1B5\uACC4",
      summary: "\uC815\uADDC\uBD84\uD3EC \uD45C\uC900\uD654, \uC774\uD56D\uBD84\uD3EC \uACF5\uC2DD, \uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uD45C\uB97C \uD65C\uC6A9\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uC815\uADDC\uBD84\uD3EC", "\uC774\uD56D\uBD84\uD3EC", "\uD45C\uC900\uD654", "\uD3C9\uADE0", "\uBD84\uC0B0", "\uD45C\uC900\uD3B8\uCC28", "\uD655\uB960\uBCC0\uC218"],
      exampleUtterances: [
        "Z=(X-\u03BC)/\u03C3\uB85C \uD45C\uC900\uD654\uD574\uC11C \uD655\uB960\uC744 \uAD6C\uD588\uC5B4\uC694",
        "\uC774\uD56D\uBD84\uD3EC B(n,p) \uACF5\uC2DD\uC744 \uC37C\uC5B4\uC694",
        "\uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uD45C\uC5D0\uC11C \uD655\uB960\uAC12\uC744 \uC77D\uC5C8\uC5B4\uC694"
      ],
      followupLabel: "\uD1B5\uACC4 \uBD84\uD3EC\uB97C \uD65C\uC6A9\uD568"
    },
    geometry: {
      id: "geometry",
      labelKo: "\uB3C4\uD615",
      summary: "\uD53C\uD0C0\uACE0\uB77C\uC2A4 \uC815\uB9AC, \uBCF4\uC870\uC120, \uC0BC\uAC01\uBE44\uB85C \uBCC0\uC758 \uAE38\uC774\xB7\uB113\uC774\uB97C \uAD6C\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uD53C\uD0C0\uACE0\uB77C\uC2A4", "\uC0BC\uAC01\uBE44", "\uBCF4\uC870\uC120", "\uC9C1\uAC01\uC0BC\uAC01\uD615", "sin", "cos", "tan", "\uB113\uC774"],
      exampleUtterances: [
        "\uD53C\uD0C0\uACE0\uB77C\uC2A4 \uC815\uB9AC\uB85C \uBE57\uBCC0 \uAE38\uC774\uB97C \uAD6C\uD588\uC5B4\uC694",
        "\uBCF4\uC870\uC120\uC744 \uADF8\uC5B4\uC11C \uC9C1\uAC01\uC0BC\uAC01\uD615\uC744 \uB9CC\uB4E4\uC5C8\uC5B4\uC694",
        "\uC0BC\uAC01\uBE44\uB85C \uB192\uC774\uB97C \uAD6C\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uB3C4\uD615 \uC131\uC9C8\uC744 \uD65C\uC6A9\uD568"
    },
    permutation: {
      id: "permutation",
      labelKo: "\uC21C\uC5F4\xB7\uC870\uD569",
      summary: "\uC21C\uC5F4\xB7\uC870\uD569 \uACF5\uC2DD, \uC911\uBCF5\xB7\uC81C\uD55C \uC870\uAC74, \uC6D0\uC21C\uC5F4\uC744 \uC774\uC6A9\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uC21C\uC5F4", "\uC870\uD569", "\uC911\uBCF5", "\uC6D0\uC21C\uC5F4", "P(n,r)", "C(n,r)", "\uB098\uC5F4"],
      exampleUtterances: [
        "\uC870\uD569 C(n,r) \uACF5\uC2DD\uC73C\uB85C \uAC00\uC9D3\uC218\uB97C \uAD6C\uD588\uC5B4\uC694",
        "\uC6D0\uC21C\uC5F4 \uACF5\uC2DD\uC744 \uC368\uC11C \uBC30\uC5F4 \uC218\uB97C \uACC4\uC0B0\uD588\uC5B4\uC694",
        "\uC911\uBCF5 \uC870\uD569\uC73C\uB85C \uD480\uC5C8\uC5B4\uC694"
      ],
      followupLabel: "\uC21C\uC5F4\xB7\uC870\uD569\uC744 \uC801\uC6A9\uD568"
    },
    sequence_limit: {
      id: "sequence_limit",
      labelKo: "\uC218\uC5F4\uC758 \uADF9\uD55C",
      summary: "\uC218\uC5F4\uC758 \uC218\uB834\xB7\uBC1C\uC0B0 \uD310\uB2E8, \u221E/\u221E \uAF34 \uCC98\uB9AC, \uB4F1\uBE44\uC218\uC5F4 \uADF9\uD55C\uC744 \uB2E4\uB8E8\uB294 \uBC29\uC2DD",
      keywords: ["\uC218\uC5F4\uC758 \uADF9\uD55C", "\uC218\uB834", "\uBC1C\uC0B0", "\uB4F1\uBE44\uC218\uC5F4", "lim", "\uADF9\uD55C\uAC12", "\uBB34\uD55C\uB4F1\uBE44\uAE09\uC218"],
      exampleUtterances: [
        "\uC218\uC5F4\uC774 \uC218\uB834\uD558\uB294\uC9C0 \uBC1C\uC0B0\uD558\uB294\uC9C0 \uD655\uC778\uD588\uC5B4\uC694",
        "\u221E/\u221E \uAF34\uC744 \uCD5C\uACE0\uCC28\uD56D\uC73C\uB85C \uB098\uB220\uC11C \uADF9\uD55C\uAC12\uC744 \uAD6C\uD588\uC5B4\uC694",
        "\uB4F1\uBE44\uC218\uC5F4 \uADF9\uD55C \uC870\uAC74 |r|<1\uB85C \uD310\uB2E8\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uC218\uC5F4\uC758 \uADF9\uD55C\uC744 \uACC4\uC0B0\uD568"
    },
    integral_advanced: {
      id: "integral_advanced",
      labelKo: "\uC2EC\uD654 \uC801\uBD84",
      summary: "\uCE58\uD658\uC801\uBD84\xB7\uBD80\uBD84\uC801\uBD84, \uC815\uC801\uBD84 \uB113\uC774 \uACC4\uC0B0, \uBBF8\uC801\uBD84 \uAE30\uBCF8\uC815\uB9AC\uB97C \uC774\uC6A9\uD558\uB294 \uBC29\uC2DD",
      keywords: ["\uCE58\uD658\uC801\uBD84", "\uBD80\uBD84\uC801\uBD84", "\uC815\uC801\uBD84", "\uB113\uC774", "\uBBF8\uC801\uBD84 \uAD00\uACC4", "\uC808\uB313\uAC12"],
      exampleUtterances: [
        "\uCE58\uD658\uC801\uBD84\uC73C\uB85C \uBCC0\uC218\uB97C \uBC14\uAFD4\uC11C \uACC4\uC0B0\uD588\uC5B4\uC694",
        "\uC815\uC801\uBD84\uC73C\uB85C \uB113\uC774\uB97C \uAD6C\uD558\uB294\uB370 \uC808\uB313\uAC12 \uCC98\uB9AC\uAC00 \uB9C9\uD614\uC5B4\uC694",
        "\u222Bf(t)dt\uB97C \uBBF8\uBD84\uD558\uB294 \uAD00\uACC4\uC2DD\uC744 \uC37C\uC5B4\uC694"
      ],
      followupLabel: "\uC2EC\uD654 \uC801\uBD84\uC744 \uD65C\uC6A9\uD568"
    },
    diff_advanced: {
      id: "diff_advanced",
      labelKo: "\uC2EC\uD654 \uBBF8\uBD84",
      summary: "\uD569\uC131\uD568\uC218 \uBBF8\uBD84(chain rule), \uADF9\uAC12\xB7\uCD5C\uC19F\uAC12 \uD0D0\uC0C9, \uC811\uC120 \uBC29\uC815\uC2DD\uC744 \uB2E4\uB8E8\uB294 \uBC29\uC2DD",
      keywords: ["\uD569\uC131\uD568\uC218 \uBBF8\uBD84", "chain rule", "\uADF9\uAC12", "\uCD5C\uC19F\uAC12", "\uC811\uC120", "\uB3C4\uD568\uC218"],
      exampleUtterances: [
        "\uD569\uC131\uD568\uC218 chain rule\uC744 \uC368\uC11C \uBBF8\uBD84\uD588\uC5B4\uC694",
        "\uADF9\uAC12\uC744 \uCC3E\uC544\uC11C \uCD5C\uC19F\uAC12\uC744 \uAD6C\uD588\uC5B4\uC694",
        "\uC811\uC120\uC758 \uBC29\uC815\uC2DD\uC744 \uBBF8\uBD84\uC73C\uB85C \uAD6C\uD588\uC5B4\uC694"
      ],
      followupLabel: "\uC2EC\uD654 \uBBF8\uBD84\uC744 \uD65C\uC6A9\uD568"
    },
    trig_advanced: {
      id: "trig_advanced",
      labelKo: "\uC2EC\uD654 \uC0BC\uAC01\uD568\uC218",
      summary: "\uB2E8\uC704\uC6D0\uC5D0\uC11C cos\u03B8\xB7sin\u03B8 \uC88C\uD45C \uC77D\uAE30, \uBC18\uC9C0\uB984\uC774 1\uC774 \uC544\uB2CC \uC6D0\uC5D0\uC11C\uC758 \uAC12, \uC0BC\uAC01\uD568\uC218 \uD56D\uB4F1\uC2DD(sin\xB2\u03B8+cos\xB2\u03B8=1)\uC744 \uB2E4\uB8E8\uB294 \uBC29\uC2DD",
      keywords: ["\uC0BC\uAC01\uD568\uC218", "\uB2E8\uC704\uC6D0", "\uD56D\uB4F1\uC2DD", "sin", "cos", "sin\xB2+cos\xB2", "\uC0BC\uAC01\uD568\uC218 \uD56D\uB4F1\uC2DD", "\uB2E8\uC704\uC6D0 \uC88C\uD45C"],
      exampleUtterances: [
        "\uB2E8\uC704\uC6D0\uC5D0\uC11C cos\xB7sin \uC88C\uD45C\uB97C \uC77D\uB294 \uAC8C \uD5F7\uAC08\uB838\uC5B4\uC694",
        "\uBC18\uC9C0\uB984\uC774 1\uC774 \uC544\uB2CC \uC6D0\uC5D0\uC11C sin\xB7cos \uAC12 \uAD6C\uD558\uB294 \uAC8C \uB9C9\uD614\uC5B4\uC694",
        "\uC0BC\uAC01\uD568\uC218 \uD56D\uB4F1\uC2DD sin\xB2\u03B8+cos\xB2\u03B8=1 \uC801\uC6A9\uC5D0\uC11C \uB9C9\uD614\uC5B4\uC694"
      ],
      followupLabel: "\uC2EC\uD654 \uC0BC\uAC01\uD568\uC218 \uD65C\uC6A9"
    }
  };

  // data/diagnosisMap.ts
  var weaknessOrder = [
    "formula_understanding",
    "calc_repeated_error",
    "min_value_read_confusion",
    "vertex_formula_memorization",
    "coefficient_sign_confusion",
    "derivative_calculation",
    "solving_order_confusion",
    "max_min_judgement_confusion",
    "basic_concept_needed",
    "factoring_pattern_recall",
    "complex_factoring_difficulty",
    "quadratic_formula_memorization",
    "discriminant_calculation",
    "radical_simplification_error",
    "rationalization_error",
    "expansion_sign_error",
    "like_terms_error",
    "imaginary_unit_confusion",
    "complex_calc_error",
    "remainder_substitution_error",
    "simultaneous_equation_error",
    "counting_method_confusion",
    "counting_overcounting",
    // 고2
    "g2_set_operation",
    "g2_set_complement",
    "g2_set_count",
    "g2_prop_contrapositive",
    "g2_prop_necessary_sufficient",
    "g2_prop_quantifier",
    "g2_trig_unit_circle",
    "g2_trig_equation_range",
    "g2_trig_identity",
    "g2_poly_factoring",
    "g2_poly_remainder",
    "g2_eq_setup",
    "g2_radical_simplify",
    "g2_radical_rationalize",
    "g2_diff_application",
    "g2_integral_basic",
    "g2_integral_definite",
    "g2_counting_method",
    "g2_counting_overcounting",
    "g2_inequality_range",
    "g2_function_domain",
    // 고3
    "g3_diff",
    "g3_sequence",
    "g3_log_exp",
    "g3_integral",
    "g3_trig",
    "g3_limit",
    "g3_conic",
    "g3_counting",
    "g3_probability",
    "g3_statistics",
    "g3_vector",
    "g3_space_geometry",
    "g1_geometry",
    "g3_function"
  ];
  var diagnosisMap = {
    formula_understanding: {
      id: "formula_understanding",
      labelKo: "\uACF5\uC2DD \uC774\uD574 \uBD80\uC871",
      topicLabel: "\uC774\uCC28\uD568\uC218",
      desc: "\uC644\uC804\uC81C\uACF1\uC2DD \uBCC0\uD658 \uC6D0\uB9AC\uB97C \uC544\uC9C1 \uCDA9\uBD84\uD788 \uCCB4\uD654\uD558\uC9C0 \uBABB\uD55C \uC0C1\uD0DC\uC785\uB2C8\uB2E4.",
      tip: "x \uACC4\uC218\uC758 \uC808\uBC18\uC744 \uC81C\uACF1\uD558\uB294 \uADDC\uCE59\uC744 \uBA3C\uC800 \uACE0\uC815\uD558\uACE0, \uBCC0\uD615\uC744 \uD55C \uC904\uC529 \uC801\uC5B4 \uBCF4\uC138\uC694."
    },
    calc_repeated_error: {
      id: "calc_repeated_error",
      labelKo: "\uACC4\uC0B0 \uC2E4\uC218 \uBC18\uBCF5",
      topicLabel: "\uACF5\uD1B5",
      desc: "\uAC1C\uB150\uC740 \uC54C\uACE0 \uC788\uC9C0\uB9CC \uBD80\uD638/\uC0AC\uCE59\uC5F0\uC0B0\uC5D0\uC11C \uBC18\uBCF5 \uC2E4\uC218\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uC74C\uC218 \uACC4\uC0B0 \uAD6C\uAC04\uC744 \uBD84\uB9AC\uD574\uC11C \uAC80\uC0B0\uD558\uACE0, \uB9C8\uC9C0\uB9C9 \uD55C \uC904\uC744 \uBC18\uB4DC\uC2DC \uB2E4\uC2DC \uD655\uC778\uD558\uC138\uC694."
    },
    min_value_read_confusion: {
      id: "min_value_read_confusion",
      labelKo: "\uCD5C\uC19F\uAC12 \uC77D\uAE30 \uD63C\uB3D9",
      topicLabel: "\uC774\uCC28\uD568\uC218",
      desc: "(x-a)^2+b \uD615\uD0DC\uC5D0\uC11C \uCD5C\uC19F\uAC12 b\uC640 \uCD5C\uC19F\uAC12\uC744 \uAC16\uB294 x=a\uB97C \uD63C\uB3D9\uD558\uB294 \uD328\uD134\uC785\uB2C8\uB2E4.",
      tip: "\uCD5C\uC19F\uAC12(y)\uACFC \uADF8\uB54C\uC758 x\uAC12\uC744 \uB530\uB85C \uC801\uB294 \uC2B5\uAD00\uC744 \uB4E4\uC774\uBA74 \uC2E4\uC218\uAC00 \uC904\uC5B4\uB4ED\uB2C8\uB2E4."
    },
    vertex_formula_memorization: {
      id: "vertex_formula_memorization",
      labelKo: "\uACF5\uC2DD \uC554\uAE30 \uBD80\uC871",
      topicLabel: "\uC774\uCC28\uD568\uC218",
      desc: "\uAF2D\uC9D3\uC810 x\uC88C\uD45C \uACF5\uC2DD -b/2a \uC801\uC6A9\uC774 \uC544\uC9C1 \uBD88\uC548\uC815\uD569\uB2C8\uB2E4.",
      tip: "b\uC758 \uBD80\uD638\uB97C \uD3EC\uD568\uD574 \uC77D\uACE0, -b\uB97C \uBA3C\uC800 \uACC4\uC0B0\uD55C \uB4A4 2a\uB85C \uB098\uB204\uB294 \uC21C\uC11C\uB97C \uACE0\uC815\uD558\uC138\uC694."
    },
    coefficient_sign_confusion: {
      id: "coefficient_sign_confusion",
      labelKo: "\uACC4\uC218 \uAD6C\uBD84 \uD63C\uB3D9",
      topicLabel: "\uC774\uCC28\uD568\uC218",
      desc: "a, b, c \uACC4\uC218\uB97C \uBD80\uD638 \uD3EC\uD568\uC73C\uB85C \uC77D\uB294 \uB2E8\uACC4\uC5D0\uC11C \uD63C\uB3D9\uC774 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uC2DD\uC744 ax^2+bx+c \uD615\uD0DC\uB85C \uC9C1\uC811 \uB2E4\uC2DC \uC4F0\uACE0 \uACC4\uC218\uB97C \uBD80\uD638 \uD3EC\uD568\uC73C\uB85C \uCCB4\uD06C\uD558\uC138\uC694."
    },
    derivative_calculation: {
      id: "derivative_calculation",
      labelKo: "\uBBF8\uBD84 \uACC4\uC0B0 \uBD80\uC871",
      topicLabel: "\uBBF8\uBD84",
      desc: "x^n \uBBF8\uBD84 \uADDC\uCE59 \uC801\uC6A9\uC774 \uD754\uB4E4\uB824 \uACC4\uC0B0 \uB2E8\uACC4\uC5D0\uC11C \uC624\uB2F5\uC774 \uB0AC\uC2B5\uB2C8\uB2E4.",
      tip: "\uC9C0\uC218\uB294 \uC55E\uC73C\uB85C \uACF1\uD558\uACE0 \uC9C0\uC218\uB294 1 \uAC10\uC18C\uD55C\uB2E4\uB294 \uD328\uD134\uC744 \uD56D\uBCC4\uB85C \uBD84\uB9AC\uD574 \uC801\uC6A9\uD558\uC138\uC694."
    },
    solving_order_confusion: {
      id: "solving_order_confusion",
      labelKo: "\uD480\uC774 \uC21C\uC11C \uD63C\uB3D9",
      topicLabel: "\uBBF8\uBD84",
      desc: "f'(x)=0\uC73C\uB85C x\uB97C \uAD6C\uD55C \uB4A4 f(x)\uC5D0 \uB300\uC785\uD558\uB294 \uC21C\uC11C\uAC00 \uB204\uB77D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "x \uB3C4\uCD9C -> \uC6D0\uD568\uC218 \uB300\uC785 -> \uCD5C\uB313\uAC12/\uCD5C\uC19F\uAC12 \uD310\uC815\uC758 3\uB2E8\uACC4\uB97C \uCCB4\uD06C\uB9AC\uC2A4\uD2B8\uB85C \uC720\uC9C0\uD558\uC138\uC694."
    },
    max_min_judgement_confusion: {
      id: "max_min_judgement_confusion",
      labelKo: "\uCD5C\uB313\uAC12/\uCD5C\uC19F\uAC12 \uD310\uB2E8 \uD63C\uB3D9",
      topicLabel: "\uC774\uCC28\uD568\uC218",
      desc: "a\uC758 \uBD80\uD638\uB85C \uADF8\uB798\uD504 \uBCFC\uB85D \uBC29\uD5A5\uC744 \uD574\uC11D\uD558\uB294 \uB2E8\uACC4\uC5D0\uC11C \uC624\uD310\uC774 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "a>0\uC740 \uCD5C\uC19F\uAC12, a<0\uC740 \uCD5C\uB313\uAC12\uC744 \uBA3C\uC800 \uD310\uB2E8\uD55C \uB4A4 \uAC12\uC744 \uACC4\uC0B0\uD558\uC138\uC694."
    },
    basic_concept_needed: {
      id: "basic_concept_needed",
      labelKo: "\uAE30\uCD08 \uAC1C\uB150 \uD559\uC2B5 \uD544\uC694",
      topicLabel: "\uACF5\uD1B5",
      desc: "\uD575\uC2EC \uAC1C\uB150 \uC815\uB9AC\uAC00 \uBD80\uC871\uD574 \uBB38\uC81C \uC811\uADFC \uC790\uCCB4\uAC00 \uC5B4\uB824\uC6B4 \uC0C1\uD0DC\uC785\uB2C8\uB2E4.",
      tip: "\uC644\uC804\uC81C\uACF1\uC2DD\uACFC \uAF2D\uC9D3\uC810 \uD574\uC11D\uC744 \uBA3C\uC800 \uC9E7\uC740 \uBB38\uC81C\uB85C \uBC18\uBCF5\uD574 \uAE30\uBC18\uC744 \uB9CC\uB4E0 \uB4A4 \uD655\uC7A5\uD558\uC138\uC694."
    },
    factoring_pattern_recall: {
      id: "factoring_pattern_recall",
      labelKo: "\uC778\uC218\uBD84\uD574 \uD328\uD134 \uC554\uAE30 \uBD80\uC871",
      topicLabel: "\uC778\uC218\uBD84\uD574",
      desc: "\uC778\uC218\uBD84\uD574 \uACF5\uC2DD\uC774\uB098 \uAE30\uBCF8 \uD328\uD134\uC744 \uB5A0\uC62C\uB9AC\uB294\uB370 \uC5B4\uB824\uC6C0\uC774 \uC788\uC2B5\uB2C8\uB2E4.",
      tip: "\uC790\uC8FC \uC4F0\uC774\uB294 \uC778\uC218\uBD84\uD574 \uACF5\uC2DD(\uD569\uCC28, \uC644\uC804\uC81C\uACF1 \uB4F1)\uC744 \uBC18\uBCF5\uD574\uC11C \uC4F0\uACE0 \uC678\uC6CC\uBCF4\uC138\uC694."
    },
    complex_factoring_difficulty: {
      id: "complex_factoring_difficulty",
      labelKo: "\uBCF5\uC7A1\uD55C \uC2DD \uC778\uC218\uBD84\uD574 \uC5B4\uB824\uC6C0",
      topicLabel: "\uC778\uC218\uBD84\uD574",
      desc: "\uD56D\uC774 \uB9CE\uAC70\uB098 \uCE58\uD658\uC774 \uD544\uC694\uD55C \uBCF5\uC7A1\uD55C \uD615\uD0DC\uC758 \uC2DD\uC744 \uC801\uC808\uD788 \uBB36\uC5B4\uB0B4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uACF5\uD1B5\uC778\uC218\uAC00 \uBCF4\uC774\uB3C4\uB85D \uC2DD\uC744 \uBB36\uAC70\uB098, \uACF5\uD1B5\uBD80\uBD84\uC744 \uB2E4\uB978 \uBB38\uC790\uB85C \uCE58\uD658\uD574 \uAC04\uB2E8\uD788 \uB9CC\uB4DC\uC138\uC694."
    },
    quadratic_formula_memorization: {
      id: "quadratic_formula_memorization",
      labelKo: "\uADFC\uC758\uACF5\uC2DD \uC554\uAE30 \uBD80\uC871",
      topicLabel: "\uC774\uCC28\uBC29\uC815\uC2DD",
      desc: "\uADFC\uC758 \uACF5\uC2DD\uC744 \uC815\uD655\uD558\uAC8C \uAE30\uC5B5\uD558\uC9C0 \uBABB\uD574 \uB300\uC785 \uB2E8\uACC4\uC5D0\uC11C \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD569\uB2C8\uB2E4.",
      tip: "\uADFC\uC758 \uACF5\uC2DD\uC744 \uC801\uC5B4\uB450\uACE0, \uACC4\uC218 a, b, c\uB97C \uCC3E\uC740 \uD6C4 \uD558\uB098\uC529 \uB300\uC785\uD558\uB294 \uC5F0\uC2B5\uC744 \uD558\uC138\uC694."
    },
    discriminant_calculation: {
      id: "discriminant_calculation",
      labelKo: "\uD310\uBCC4\uC2DD \uACC4\uC0B0 \uC2E4\uC218",
      topicLabel: "\uC774\uCC28\uBC29\uC815\uC2DD",
      desc: "\uADFC\uD638 \uC548\uC758 \uD310\uBCC4\uC2DD(b^2 - 4ac)\uC744 \uACC4\uC0B0\uD558\uB294 \uB3C4\uC911 \uC2E4\uC218\uAC00 \uC790\uC8FC \uBC1C\uC0DD\uD569\uB2C8\uB2E4.",
      tip: "b^2\uACFC 4ac\uB97C \uAC01\uAC01 \uB530\uB85C \uACC4\uC0B0\uD55C \uB4A4 \uBE7C\uB294 \uBC29\uC2DD\uC73C\uB85C, \uBD80\uD638 \uC2E4\uC218\uB97C \uBC29\uC9C0\uD558\uC138\uC694."
    },
    radical_simplification_error: {
      id: "radical_simplification_error",
      labelKo: "\u221A \uAC04\uC18C\uD654 \uC2E4\uC218",
      topicLabel: "\uBB34\uB9AC\uC218",
      desc: "\uC81C\uACF1\uADFC \uC548\uC758 \uC218\uB97C \uC778\uC218\uBD84\uD574\uD574 \uAC04\uC18C\uD654\uD558\uB294 \uB2E8\uACC4\uC5D0\uC11C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\u221A \uC548\uC758 \uC218\uB97C \uC18C\uC778\uC218\uBD84\uD574\uD55C \uB4A4 \uC81C\uACF1 \uBB36\uC74C\uC744 \uBC16\uC73C\uB85C \uAEBC\uB0B4\uB294 \uACFC\uC815\uC744 \uB2E8\uACC4\uBCC4\uB85C \uC801\uC5B4\uBCF4\uC138\uC694."
    },
    rationalization_error: {
      id: "rationalization_error",
      labelKo: "\uBD84\uBAA8 \uC720\uB9AC\uD654 \uC2E4\uC218",
      topicLabel: "\uBB34\uB9AC\uC218",
      desc: "\uBD84\uBAA8\uC5D0 \u221A\uAC00 \uC788\uC744 \uB54C \uC720\uB9AC\uD654 \uACFC\uC815\uC5D0\uC11C \uBD84\uC790\xB7\uBD84\uBAA8\uB97C \uC798\uBABB \uCC98\uB9AC\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uBD84\uBAA8\uC640 \uAC19\uC740 \u221A\uB97C \uBD84\uC790\xB7\uBD84\uBAA8\uC5D0 \uACF1\uD55C \uB4A4 \uC57D\uBD84\uAE4C\uC9C0 \uD55C \uBC88\uC5D0 \uCC98\uB9AC\uD558\uB294 \uC2B5\uAD00\uC744 \uB4E4\uC774\uC138\uC694."
    },
    expansion_sign_error: {
      id: "expansion_sign_error",
      labelKo: "\uC804\uAC1C \uBD80\uD638 \uC2E4\uC218",
      topicLabel: "\uB2E4\uD56D\uC2DD",
      desc: "\uB2E4\uD56D\uC2DD\uC744 \uC804\uAC1C\uD560 \uB54C \uC74C\uC218 \uAD04\uD638 \uCC98\uB9AC\uB098 \uBD80\uD638 \uBD84\uBC30\uC5D0\uC11C \uC2E4\uC218\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uAD04\uD638 \uC55E\uC758 \uBD80\uD638\uB97C \uAC15\uC870 \uD45C\uC2DC\uD55C \uB4A4 \uAC01 \uD56D\uC5D0 \uBD84\uBC30\uD558\uB294 \uACFC\uC815\uC744 \uB530\uB85C \uC801\uC5B4\uBCF4\uC138\uC694."
    },
    like_terms_error: {
      id: "like_terms_error",
      labelKo: "\uB3D9\uB958\uD56D \uC815\uB9AC \uC2E4\uC218",
      topicLabel: "\uB2E4\uD56D\uC2DD",
      desc: "\uC804\uAC1C \uD6C4 \uAC19\uC740 \uCC28\uC218\uC758 \uD56D\uB07C\uB9AC \uBAA8\uC544 \uC815\uB9AC\uD558\uB294 \uB2E8\uACC4\uC5D0\uC11C \uB204\uB77D\uC774\uB098 \uC2E4\uC218\uAC00 \uC0DD\uACBC\uC2B5\uB2C8\uB2E4.",
      tip: "\uC804\uAC1C \uC9C1\uD6C4 \uAC01 \uCC28\uC218\uBCC4\uB85C \uC0C9\uC744 \uB2EC\uB9AC\uD574 \uD45C\uC2DC\uD55C \uB4A4 \uD55C\uAEBC\uBC88\uC5D0 \uD569\uC0B0\uD558\uC138\uC694."
    },
    imaginary_unit_confusion: {
      id: "imaginary_unit_confusion",
      labelKo: "i\xB2 = -1 \uD63C\uB3D9",
      topicLabel: "\uBCF5\uC18C\uC218",
      desc: "\uD5C8\uC218 \uB2E8\uC704 i\uB97C \uC81C\uACF1\uD560 \uB54C -1\uB85C \uCE58\uD658\uD558\uB294 \uADDC\uCE59\uC744 \uBE60\uB728\uB9AC\uAC70\uB098 \uC798\uBABB \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "i\xB2\uAC00 \uB4F1\uC7A5\uD558\uB294 \uC989\uC2DC -1\uB85C \uBC14\uAFD4 \uC4F0\uB294 \uC2B5\uAD00\uC744 \uB4E4\uC774\uBA74 \uC774\uD6C4 \uACC4\uC0B0\uC774 \uD6E8\uC52C \uB2E8\uC21C\uD574\uC9D1\uB2C8\uB2E4."
    },
    complex_calc_error: {
      id: "complex_calc_error",
      labelKo: "\uBCF5\uC18C\uC218 \uC2E4\uC218\uBD80/\uD5C8\uC218\uBD80 \uC815\uB9AC \uC2E4\uC218",
      topicLabel: "\uBCF5\uC18C\uC218",
      desc: "\uC804\uAC1C \uD6C4 \uC2E4\uC218\uBD80\uC640 \uD5C8\uC218\uBD80\uB97C \uB530\uB85C \uBAA8\uC544 \uC815\uB9AC\uD558\uB294 \uACFC\uC815\uC5D0\uC11C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uC804\uAC1C\uAC00 \uB05D\uB098\uBA74 \uC2E4\uC218\uD56D\uACFC \uD5C8\uC218\uD56D(i \uD3EC\uD568)\uC744 \uC0C9\uC73C\uB85C \uAD6C\uBD84\uD55C \uB4A4 \uAC01\uAC01 \uD569\uC0B0\uD558\uC138\uC694."
    },
    remainder_substitution_error: {
      id: "remainder_substitution_error",
      labelKo: "\uB098\uBA38\uC9C0\uC815\uB9AC \uB300\uC785 \uC2E4\uC218",
      topicLabel: "\uB098\uBA38\uC9C0\uC815\uB9AC",
      desc: "\uB098\uBA38\uC9C0\uC815\uB9AC\uC5D0\uC11C \uB098\uB217\uAC12(x=a)\uC744 P(x)\uC5D0 \uB300\uC785\uD558\uB294 \uB2E8\uACC4\uC5D0\uC11C \uC2E4\uC218\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uB098\uB204\uB294 \uC2DD x-a=0\uC5D0\uC11C x=a\uB97C \uBA3C\uC800 \uAD6C\uD558\uACE0, \uADF8 \uAC12\uC744 P(x)\uC5D0 \uAD04\uD638\uB85C \uBA85\uD655\uD788 \uB300\uC785\uD558\uC138\uC694."
    },
    simultaneous_equation_error: {
      id: "simultaneous_equation_error",
      labelKo: "\uC5F0\uB9BD\uBC29\uC815\uC2DD \uC124\uC815 \uC2E4\uC218",
      topicLabel: "\uBC29\uC815\uC2DD",
      desc: "\uB450 \uC870\uAC74\uC5D0\uC11C \uC5F0\uB9BD\uBC29\uC815\uC2DD\uC744 \uC138\uC6B0\uAC70\uB098 \uD480\uC774\uD558\uB294 \uACFC\uC815\uC5D0\uC11C \uC624\uB958\uAC00 \uC0DD\uACBC\uC2B5\uB2C8\uB2E4.",
      tip: "\uAC01 \uC870\uAC74\uC5D0\uC11C \uB098\uC624\uB294 \uC2DD\uC744 \uBC88\uD638\uB85C \uC815\uB9AC\uD558\uACE0, \uAC00\uAC10\uBC95 \uB610\uB294 \uB300\uC785\uBC95 \uC911 \uD558\uB098\uB97C \uBA85\uD655\uD788 \uC120\uD0DD\uD558\uC138\uC694."
    },
    counting_method_confusion: {
      id: "counting_method_confusion",
      labelKo: "\uACBD\uC6B0\uC758 \uC218 \uBC29\uBC95 \uD63C\uB3D9",
      topicLabel: "\uACBD\uC6B0\uC758 \uC218",
      desc: "\uC21C\uC5F4/\uC870\uD569/\uC218\uD615\uB3C4 \uC911 \uC5B4\uB5A4 \uBC29\uBC95\uC744 \uC368\uC57C \uD560\uC9C0 \uD310\uB2E8\uC774 \uC5B4\uB824\uC6B4 \uC0C1\uD0DC\uC785\uB2C8\uB2E4.",
      tip: "\uC21C\uC11C\uAC00 \uC911\uC694\uD558\uBA74 \uC21C\uC5F4, \uC911\uC694\uD558\uC9C0 \uC54A\uC73C\uBA74 \uC870\uD569\uC744 \uC4F4\uB2E4\uB294 \uAE30\uC900\uC744 \uBA3C\uC800 \uCCB4\uD06C\uD558\uC138\uC694."
    },
    counting_overcounting: {
      id: "counting_overcounting",
      labelKo: "\uC911\uBCF5 \uCC98\uB9AC \uC2E4\uC218",
      topicLabel: "\uACBD\uC6B0\uC758 \uC218",
      desc: "\uACBD\uC6B0\uB97C \uC140 \uB54C \uAC19\uC740 \uACBD\uC6B0\uB97C \uB450 \uBC88 \uC138\uAC70\uB098 \uC870\uAC74\uC744 \uC798\uBABB \uAC78\uB7EC\uB0B4\uB294 \uC2E4\uC218\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uC218\uD615\uB3C4\uB098 \uD45C\uB85C \uACBD\uC6B0\uB97C \uC9C1\uC811 \uB098\uC5F4\uD558\uBA74\uC11C \uC911\uBCF5 \uC5EC\uBD80\uB97C \uD558\uB098\uC529 \uD655\uC778\uD558\uC138\uC694."
    },
    // ─── 고2 공통 ────────────────────────────────────────────────────
    g2_set_operation: {
      id: "g2_set_operation",
      labelKo: "\uC9D1\uD569 \uC5F0\uC0B0 \uC624\uB958",
      topicLabel: "\uC9D1\uD569",
      desc: "\uD569\uC9D1\uD569\xB7\uAD50\uC9D1\uD569 \uACC4\uC0B0\uC5D0\uC11C \uC6D0\uC18C \uC911\uBCF5 \uCC98\uB9AC\uB098 \uC5F0\uC0B0 \uC21C\uC11C\uB97C \uC798\uBABB \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "A\u222AB\uB294 \uB450 \uC9D1\uD569\uC758 \uBAA8\uB4E0 \uC6D0\uC18C, A\u2229B\uB294 \uACF5\uD1B5 \uC6D0\uC18C\uC784\uC744 \uBCA4 \uB2E4\uC774\uC5B4\uADF8\uB7A8\uC73C\uB85C \uBA3C\uC800 \uADF8\uB824\uBCF4\uC138\uC694."
    },
    g2_set_complement: {
      id: "g2_set_complement",
      labelKo: "\uC5EC\uC9D1\uD569 \uBC94\uC704 \uD63C\uB3D9",
      topicLabel: "\uC9D1\uD569",
      desc: "\uC804\uCCB4\uC9D1\uD569 U\uC5D0\uC11C \uC5EC\uC9D1\uD569 A^c\uC758 \uBC94\uC704\uB97C \uC798\uBABB \uC124\uC815\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "A^c = U - A\uC784\uC744 \uBA3C\uC800 \uD655\uC778\uD558\uACE0, \uC804\uCCB4\uC9D1\uD569 U\uC758 \uBC94\uC704\uB97C \uBA85\uC2DC\uC801\uC73C\uB85C \uC801\uC5B4\uBCF4\uC138\uC694."
    },
    g2_set_count: {
      id: "g2_set_count",
      labelKo: "\uC6D0\uC18C \uAC1C\uC218 \uACC4\uC0B0 \uC624\uB958",
      topicLabel: "\uC9D1\uD569",
      desc: "n(A\u222AB) = n(A)+n(B)-n(A\u2229B) \uACF5\uC2DD \uC801\uC6A9\uC5D0\uC11C \uC911\uBCF5 \uC6D0\uC18C\uB97C \uBE60\uB728\uB9AC\uAC70\uB098 \uB354 \uBE90\uC2B5\uB2C8\uB2E4.",
      tip: "\uACF5\uC2DD\uC744 \uC4F0\uAE30 \uC804\uC5D0 n(A\u2229B)\uB97C \uBA3C\uC800 \uAD6C\uD558\uACE0, \uC911\uBCF5\uB41C \uC6D0\uC18C\uB97C \uB531 \uD55C \uBC88\uB9CC \uBE7C\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    },
    g2_prop_contrapositive: {
      id: "g2_prop_contrapositive",
      labelKo: "\uC5ED\xB7\uC774\xB7\uB300\uC6B0 \uD63C\uB3D9",
      topicLabel: "\uBA85\uC81C",
      desc: "p\u2192q\uC758 \uC5ED(q\u2192p), \uC774(~p\u2192~q), \uB300\uC6B0(~q\u2192~p)\uB97C \uD63C\uB3D9\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uC5ED\xB7\uC774\xB7\uB300\uC6B0 \uD45C\uB97C \uC9C1\uC811 \uCC44\uC6B0\uBA74\uC11C \uAC01\uAC01 p\u2192q \uBC29\uD5A5\uC774 \uC5B4\uB5BB\uAC8C \uBC14\uB00C\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
    },
    g2_prop_necessary_sufficient: {
      id: "g2_prop_necessary_sufficient",
      labelKo: "\uD544\uC694\uCDA9\uBD84\uC870\uAC74 \uC624\uB958",
      topicLabel: "\uBA85\uC81C",
      desc: "p\u2192q\uC640 q\u2192p \uBC29\uD5A5\uC744 \uBAA8\uB450 \uD655\uC778\uD558\uC9C0 \uC54A\uACE0 \uD544\uC694\xB7\uCDA9\uBD84 \uC870\uAC74\uC744 \uACB0\uC815\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "p\uC774\uBA74 q\uC778\uAC00(\uCDA9\uBD84), q\uC774\uBA74 p\uC778\uAC00(\uD544\uC694) \uB450 \uBC29\uD5A5\uC744 \uAC01\uAC01 \uD654\uC0B4\uD45C\uB85C \uADF8\uB824\uBCF4\uC138\uC694."
    },
    g2_prop_quantifier: {
      id: "g2_prop_quantifier",
      labelKo: "\uC804\uCE6D\xB7\uC874\uC7AC \uBA85\uC81C \uD63C\uB3D9",
      topicLabel: "\uBA85\uC81C",
      desc: '"\uBAA8\uB4E0 x\uC5D0 \uB300\uD574"\uC640 "\uC5B4\uB5A4 x\uC5D0 \uB300\uD574" \uBA85\uC81C\uB97C \uAD6C\uBCC4\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
      tip: "\uC804\uCE6D \uBA85\uC81C\uB294 \uBC18\uB840 \uD558\uB098\uB85C \uAC70\uC9D3, \uC874\uC7AC \uBA85\uC81C\uB294 \uC608\uC2DC \uD558\uB098\uB85C \uCC38\uC784\uC744 \uAE30\uC5B5\uD558\uC138\uC694."
    },
    g2_trig_unit_circle: {
      id: "g2_trig_unit_circle",
      labelKo: "\uB2E8\uC704\uC6D0 \uC88C\uD45C \uD63C\uB3D9",
      topicLabel: "\uC0BC\uAC01\uD568\uC218",
      desc: "\uAC01\uB3C4 \u03B8\uC5D0\uC11C sin\u03B8\xB7cos\u03B8\xB7tan\u03B8 \uAC12\uC744 \uB2E8\uC704\uC6D0 \uC88C\uD45C\uC5D0\uC11C \uC798\uBABB \uC77D\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "\uB2E8\uC704\uC6D0\uC5D0\uC11C x\uC88C\uD45C=cos\u03B8, y\uC88C\uD45C=sin\u03B8\uC784\uC744 \uBA3C\uC800 \uD655\uC778\uD558\uACE0 \uC0AC\uBD84\uBA74 \uBD80\uD638\uB97C \uACB0\uC815\uD558\uC138\uC694."
    },
    g2_trig_equation_range: {
      id: "g2_trig_equation_range",
      labelKo: "\uC0BC\uAC01\uBC29\uC815\uC2DD \uBC94\uC704 \uC624\uB958",
      topicLabel: "\uC0BC\uAC01\uD568\uC218",
      desc: "\uC0BC\uAC01\uBC29\uC815\uC2DD\uC758 \uD574\uB97C \uAD6C\uD560 \uB54C \uC8FC\uC5B4\uC9C4 \uAC01\uB3C4 \uBC94\uC704\uB97C \uBC97\uC5B4\uB09C \uD574\uB97C \uD3EC\uD568\uD558\uAC70\uB098 \uB204\uB77D\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uB2E8\uC704\uC6D0\uC5D0\uC11C \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uAC01\uB3C4\uB97C \uBAA8\uB450 \uCC3E\uC740 \uB4A4, \uBC94\uC704\uC5D0 \uD574\uB2F9\uD558\uB294 \uAC83\uB9CC \uC120\uD0DD\uD558\uC138\uC694."
    },
    g2_trig_identity: {
      id: "g2_trig_identity",
      labelKo: "\uC0BC\uAC01\uD568\uC218 \uD56D\uB4F1\uC2DD \uC624\uB958",
      topicLabel: "\uC0BC\uAC01\uD568\uC218",
      desc: "sin\xB2\u03B8+cos\xB2\u03B8=1, tan\u03B8=sin\u03B8/cos\u03B8 \uB4F1 \uAE30\uBCF8 \uD56D\uB4F1\uC2DD\uC744 \uC798\uBABB \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uD56D\uB4F1\uC2DD\uC744 \uC4F0\uAE30 \uC804\uC5D0 sin\u03B8\xB7cos\u03B8\xB7tan\u03B8\uC758 \uAD00\uACC4\uB97C \uD55C \uC904\uB85C \uBA3C\uC800 \uC801\uC5B4\uBCF4\uC138\uC694."
    },
    g2_poly_factoring: {
      id: "g2_poly_factoring",
      labelKo: "\uC778\uC218\uBD84\uD574 \uD328\uD134 \uB204\uB77D",
      topicLabel: "\uB2E4\uD56D\uC2DD",
      desc: "\uACE0\uCC28 \uB2E4\uD56D\uC2DD\uC5D0\uC11C \uC778\uC218\uBD84\uD574 \uACF5\uC2DD(\uC778\uC218\uC815\uB9AC \uD65C\uC6A9, \uCE58\uD658 \uB4F1)\uC744 \uB5A0\uC62C\uB9AC\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uC0C1\uC218\uD56D\uC758 \uC57D\uC218\uB97C \uB300\uC785\uD574 \uADFC\uC744 \uCC3E\uACE0, \uC870\uB9BD\uC81C\uBC95\uC73C\uB85C \uC778\uC218\uB97C \uD558\uB098\uC529 \uAEBC\uB0B4\uB294 \uD750\uB984\uC744 \uC5F0\uC2B5\uD558\uC138\uC694."
    },
    g2_poly_remainder: {
      id: "g2_poly_remainder",
      labelKo: "\uB098\uBA38\uC9C0\uC815\uB9AC \uC801\uC6A9 \uC624\uB958",
      topicLabel: "\uB098\uBA38\uC9C0\uC815\uB9AC",
      desc: "f(x)\uB97C (x-a)\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uAC00 f(a)\uC784\uC744 \uC798\uBABB \uC801\uC6A9\uD558\uAC70\uB098 \uC778\uC218\uC815\uB9AC \uC870\uAC74\uC744 \uD63C\uB3D9\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uB098\uBA38\uC9C0 = f(\uB098\uB204\uB294 \uC2DD\uC758 \uADFC) \uC784\uC744 \uBA3C\uC800 \uD655\uC778\uD558\uACE0, \uC870\uAC74\uC2DD\uC5D0 \uB300\uC785\uD558\uB294 \uC21C\uC11C\uB97C \uC9C0\uD0A4\uC138\uC694."
    },
    g2_eq_setup: {
      id: "g2_eq_setup",
      labelKo: "\uBC29\uC815\uC2DD \uC138\uC6B0\uAE30\xB7\uC21C\uC11C \uC624\uB958",
      topicLabel: "\uBC29\uC815\uC2DD",
      desc: "\uC870\uAC74\uC744 \uBC29\uC815\uC2DD\uC73C\uB85C \uBCC0\uD658\uD558\uB294 \uB2E8\uACC4 \uB610\uB294 \uD480\uC774 \uC21C\uC11C(\uADFC \uAD6C\uD558\uAE30 \u2192 \uAC80\uC99D)\uB97C \uC798\uBABB \uC124\uC815\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uAD6C\uD558\uB294 \uAC12\uC744 x\uB85C \uB193\uACE0, \uC8FC\uC5B4\uC9C4 \uC870\uAC74\uC744 \uD558\uB098\uC529 \uC2DD\uC73C\uB85C \uC801\uC740 \uB4A4 \uD480\uC774 \uC21C\uC11C\uB97C \uC815\uB9AC\uD558\uC138\uC694."
    },
    g2_radical_simplify: {
      id: "g2_radical_simplify",
      labelKo: "\uBB34\uB9AC\uC2DD \uAC04\uC18C\uD654 \uC624\uB958",
      topicLabel: "\uBB34\uB9AC\uC218",
      desc: "\u221Aa\xB7\u221Ab = \u221A(ab), \u221A(a\xB2) = |a| \uB4F1 \uBB34\uB9AC\uC2DD \uAC04\uC18C\uD654 \uADDC\uCE59\uC744 \uC798\uBABB \uC801\uC6A9\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uADFC\uD638 \uC548 \uC22B\uC790\uB97C \uC18C\uC778\uC218\uBD84\uD574\uD558\uC5EC \uC81C\uACF1\uC218\uB97C \uAEBC\uB0B4\uB294 \uC21C\uC11C\uB97C \uB2E8\uACC4\uBCC4\uB85C \uC801\uC5B4\uBCF4\uC138\uC694."
    },
    g2_radical_rationalize: {
      id: "g2_radical_rationalize",
      labelKo: "\uC720\uB9AC\uD654 \uACC4\uC0B0 \uC624\uB958",
      topicLabel: "\uBB34\uB9AC\uC218",
      desc: "\uBD84\uBAA8\uC758 \uBB34\uB9AC\uC218\uB97C \uC720\uB9AC\uD654\uD560 \uB54C \uCF24\uB808\uC2DD\uC744 \uC798\uBABB \uACF1\uD558\uAC70\uB098 \uC804\uAC1C\uC5D0\uC11C \uC2E4\uC218\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uBD84\uBAA8\uAC00 a+\u221Ab \uD615\uD0DC\uBA74 \uCF24\uB808 a-\u221Ab\uB97C \uBD84\uC790\xB7\uBD84\uBAA8 \uBAA8\uB450 \uACF1\uD558\uACE0, \uBD84\uBAA8 \uC804\uAC1C \uACB0\uACFC\uB97C \uBA3C\uC800 \uD655\uC778\uD558\uC138\uC694."
    },
    g2_diff_application: {
      id: "g2_diff_application",
      labelKo: "\uBBF8\uBD84 \uD65C\uC6A9 \uC624\uB958",
      topicLabel: "\uBBF8\uBD84",
      desc: "f'(x)=0\uC758 \uD574\uB97C \uAD6C\uD55C \uB4A4 \uC99D\uAC10\uD45C\uB85C \uCD5C\uB313\uAC12\xB7\uCD5C\uC19F\uAC12\uC744 \uACB0\uC815\uD558\uB294 \uB2E8\uACC4\uC5D0\uC11C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "f'(x)=0\uC758 x\uAC12 \u2192 \uC99D\uAC10\uD45C \uC791\uC131 \u2192 \uADF9\uAC12 \uACB0\uC815\uC758 3\uB2E8\uACC4\uB97C \uC21C\uC11C\uB300\uB85C \uC801\uC5B4\uBCF4\uC138\uC694."
    },
    g2_integral_basic: {
      id: "g2_integral_basic",
      labelKo: "\uBD80\uC815\uC801\uBD84 \uACF5\uC2DD \uC624\uB958",
      topicLabel: "\uC801\uBD84",
      desc: "\u222Bx\u207Fdx = x\u207F\u207A\xB9/(n+1)+C \uACF5\uC2DD \uC801\uC6A9\uC5D0\uC11C \uC9C0\uC218 \uCC98\uB9AC\uB098 \uACC4\uC218 \uACC4\uC0B0\uC744 \uC798\uBABB\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uC9C0\uC218\uB97C 1 \uC62C\uB9AC\uACE0, \uC62C\uB9B0 \uC9C0\uC218\uB85C \uB098\uB204\uB294 \uB450 \uB2E8\uACC4\uB97C \uD55C \uD56D\uC529 \uB530\uB85C \uC801\uC5B4\uBCF4\uC138\uC694."
    },
    g2_integral_definite: {
      id: "g2_integral_definite",
      labelKo: "\uC815\uC801\uBD84 \uB05D\uAC12 \uB300\uC785 \uC624\uB958",
      topicLabel: "\uC801\uBD84",
      desc: "\uC815\uC801\uBD84 [F(x)]\u2090\u1D47 = F(b)-F(a)\uC5D0\uC11C \uB05D\uAC12 \uB300\uC785 \uC21C\uC11C\uB098 \uBE7C\uAE30 \uBD80\uD638\uB97C \uC798\uBABB \uCC98\uB9AC\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "F(\uC704\uB05D) - F(\uC544\uB798\uB05D) \uC21C\uC11C\uB97C \uC9C0\uD0A4\uACE0, \uB450 \uAC12\uC744 \uB530\uB85C \uACC4\uC0B0\uD55C \uB4A4 \uBE7C\uBCF4\uC138\uC694."
    },
    g2_counting_method: {
      id: "g2_counting_method",
      labelKo: "\uACBD\uC6B0\uC758 \uC218 \uBC29\uBC95 \uC120\uD0DD \uC624\uB958",
      topicLabel: "\uACBD\uC6B0\uC758 \uC218",
      desc: "\uC21C\uC5F4\xB7\uC870\uD569\xB7\uACF1\uC758 \uBC95\uCE59\xB7\uD569\uC758 \uBC95\uCE59 \uC911 \uC5B4\uB290 \uBC29\uBC95\uC744 \uC368\uC57C \uD558\uB294\uC9C0 \uC798\uBABB \uD310\uB2E8\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uC21C\uC11C\uAC00 \uC788\uC73C\uBA74 \uC21C\uC5F4(P), \uC5C6\uC73C\uBA74 \uC870\uD569(C). \uB3C5\uB9BD \uC0AC\uAC74\uC740 \uACF1, \uBC30\uD0C0 \uC0AC\uAC74\uC740 \uD569\uC784\uC744 \uBA3C\uC800 \uD655\uC778\uD558\uC138\uC694."
    },
    g2_counting_overcounting: {
      id: "g2_counting_overcounting",
      labelKo: "\uC911\uBCF5 \uACC4\uC0B0 \uC624\uB958",
      topicLabel: "\uACBD\uC6B0\uC758 \uC218",
      desc: "\uC870\uAC74\uC774 \uACB9\uCE58\uB294 \uACBD\uC6B0\uB97C \uC911\uBCF5\uC73C\uB85C \uC138\uAC70\uB098 \uBE60\uB728\uB838\uC2B5\uB2C8\uB2E4.",
      tip: "\uD3EC\uD568-\uBC30\uC81C \uC6D0\uB9AC: n(A\u222AB) = n(A)+n(B)-n(A\u2229B). \uACB9\uCE58\uB294 \uCF00\uC774\uC2A4\uB97C \uBA85\uC2DC\uC801\uC73C\uB85C \uD45C\uC2DC\uD558\uC138\uC694."
    },
    g2_inequality_range: {
      id: "g2_inequality_range",
      labelKo: "\uC774\uCC28\uBD80\uB4F1\uC2DD \uBC94\uC704 \uC624\uB958",
      topicLabel: "\uBD80\uB4F1\uC2DD",
      desc: "\uC774\uCC28\uBD80\uB4F1\uC2DD\uC744 \uD480 \uB54C a\uC758 \uBD80\uD638\uC5D0 \uB530\uB978 \uD3EC\uBB3C\uC120 \uBC29\uD5A5\uC744 \uC798\uBABB \uC801\uC6A9\uD558\uAC70\uB098 \uD574\uC758 \uBC94\uC704\uB97C \uBC18\uB300\uB85C \uC37C\uC2B5\uB2C8\uB2E4.",
      tip: "ax\xB2+bx+c>0\uC758 \uD574: a>0\uC774\uBA74 \uADFC\uC758 \uBC14\uAE65, a<0\uC774\uBA74 \uADFC\uC758 \uC548\uCABD\uC784\uC744 \uADF8\uB798\uD504\uB85C \uBA3C\uC800 \uADF8\uB824\uBCF4\uC138\uC694."
    },
    g2_function_domain: {
      id: "g2_function_domain",
      labelKo: "\uC815\uC758\uC5ED\xB7\uCE58\uC5ED \uD63C\uB3D9",
      topicLabel: "\uD568\uC218",
      desc: "\uD569\uC131\uD568\uC218\uB098 \uC5ED\uD568\uC218\uC758 \uC815\uC758\uC5ED\xB7\uCE58\uC5ED\uC744 \uC798\uBABB \uC124\uC815\uD558\uAC70\uB098 \uD568\uC218 \uC131\uB9BD \uC870\uAC74\uC744 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "\uD569\uC131\uD568\uC218 f\u2218g\uB294 g \uACB0\uACFC\uAC00 f\uC758 \uC815\uC758\uC5ED \uC548\uC5D0 \uC788\uC5B4\uC57C \uD568. \uB2E8\uACC4\uBCC4\uB85C \uBC94\uC704\uB97C \uD655\uC778\uD558\uC138\uC694."
    },
    // ─── 고3 공통 ────────────────────────────────────────────────────
    g3_diff: {
      id: "g3_diff",
      labelKo: "\uBBF8\uBD84 \uACC4\uC0B0",
      topicLabel: "\uBBF8\uBD84",
      desc: "\uB2E4\uD56D\uD568\uC218\xB7\uD569\uC131\uD568\uC218\xB7\uACF1\uC758 \uBBF8\uBD84 \uACC4\uC0B0\uC5D0\uC11C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      tip: "f'(x) \uACF5\uC2DD\uC744 \uB2E8\uACC4\uBCC4\uB85C \uC801\uC6A9\uD558\uACE0, \uAC01 \uD56D\uC744 \uB3C5\uB9BD\uC801\uC73C\uB85C \uBBF8\uBD84\uD55C \uB4A4 \uD569\uC0B0\uD558\uC138\uC694."
    },
    g3_sequence: {
      id: "g3_sequence",
      labelKo: "\uC218\uC5F4 \uACC4\uC0B0",
      topicLabel: "\uC218\uC5F4",
      desc: "\uB4F1\uCC28\xB7\uB4F1\uBE44\uC218\uC5F4\uC758 \uC77C\uBC18\uD56D\uC774\uB098 \uD569 \uACF5\uC2DD \uC801\uC6A9\uC5D0\uC11C \uC2E4\uC218\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "\uB4F1\uCC28\uC218\uC5F4 a\u2099=a\u2081+(n-1)d, \uB4F1\uBE44\uC218\uC5F4 a\u2099=a\u2081\xB7r\u207F\u207B\xB9 \uACF5\uC2DD\uC744 \uBA3C\uC800 \uD655\uC778\uD558\uC138\uC694."
    },
    g3_log_exp: {
      id: "g3_log_exp",
      labelKo: "\uC9C0\uC218\xB7\uB85C\uADF8 \uACC4\uC0B0",
      topicLabel: "\uC9C0\uC218\xB7\uB85C\uADF8",
      desc: "\uC9C0\uC218\uBC95\uCE59\uC774\uB098 \uB85C\uADF8 \uC131\uC9C8 \uC801\uC6A9 \uACFC\uC815\uC5D0\uC11C \uC624\uB958\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "log\u2090b + log\u2090c = log\u2090(bc), a\u02E3\xB7a\u02B8 = a\u02E3\u207A\u02B8 \uB4F1 \uAE30\uBCF8 \uC131\uC9C8\uC744 \uC810\uAC80\uD558\uC138\uC694."
    },
    g3_integral: {
      id: "g3_integral",
      labelKo: "\uC801\uBD84 \uACC4\uC0B0",
      topicLabel: "\uC801\uBD84",
      desc: "\uBD80\uC815\uC801\uBD84\uC774\uB098 \uC815\uC801\uBD84 \uACC4\uC0B0\uC5D0\uC11C \uC2E4\uC218\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "\u222Bx\u207Fdx = x\u207F\u207A\xB9/(n+1)+C \uAE30\uBCF8 \uACF5\uC2DD\uBD80\uD130 \uD655\uC778\uD558\uACE0, \uC815\uC801\uBD84\uC740 [F(x)]\u2090\u1D47 = F(b)-F(a)\uB85C \uACC4\uC0B0\uD558\uC138\uC694."
    },
    g3_trig: {
      id: "g3_trig",
      labelKo: "\uC0BC\uAC01\uD568\uC218 \uACC4\uC0B0",
      topicLabel: "\uC0BC\uAC01\uD568\uC218",
      desc: "\uC0BC\uAC01\uD568\uC218\uC758 \uAE30\uBCF8 \uAC12\uC774\uB098 \uD56D\uB4F1\uC2DD \uC801\uC6A9\uC5D0\uC11C \uC624\uB958\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "\uB2E8\uC704\uC6D0\uC5D0\uC11C sin\xB7cos\xB7tan\uC758 \uB300\uD45C \uAC12(0\xB0, 30\xB0, 45\xB0, 60\xB0, 90\xB0)\uC744 \uC554\uAE30\uD558\uC138\uC694."
    },
    g3_limit: {
      id: "g3_limit",
      labelKo: "\uADF9\uD55C \uACC4\uC0B0",
      topicLabel: "\uADF9\uD55C",
      desc: "\uD568\uC218\uC758 \uADF9\uD55C \uACC4\uC0B0 \uACFC\uC815\uC5D0\uC11C 0/0 \uAF34 \uCC98\uB9AC\uB098 \uC778\uC218\uBD84\uD574\uAC00 \uBBF8\uC219\uD569\uB2C8\uB2E4.",
      tip: "0/0 \uAF34\uC740 \uBD84\uC790\xB7\uBD84\uBAA8\uB97C \uC778\uC218\uBD84\uD574\uD574 \uACF5\uD1B5\uC778\uC218\uB97C \uC57D\uBD84\uD55C \uB4A4 \uB300\uC785\uD558\uC138\uC694."
    },
    g3_conic: {
      id: "g3_conic",
      labelKo: "\uC774\uCC28\uACE1\uC120",
      topicLabel: "\uC774\uCC28\uACE1\uC120",
      desc: "\uD3EC\uBB3C\uC120\xB7\uD0C0\uC6D0\xB7\uC30D\uACE1\uC120\uC758 \uD45C\uC900\uD615\uACFC \uCD08\uC810\xB7\uC810\uADFC\uC120 \uACF5\uC2DD \uC801\uC6A9\uC774 \uC5B4\uB835\uC2B5\uB2C8\uB2E4.",
      tip: "\uAC01 \uACE1\uC120\uC758 \uD45C\uC900\uD615\uC744 \uBA3C\uC800 \uC815\uB9AC\uD558\uC138\uC694: \uD3EC\uBB3C\uC120 y\xB2=4px, \uD0C0\uC6D0 x\xB2/a\xB2+y\xB2/b\xB2=1, \uC30D\uACE1\uC120 x\xB2/a\xB2-y\xB2/b\xB2=1."
    },
    // ─── 고3 확통 특화 ───────────────────────────────────────────────
    g3_counting: {
      id: "g3_counting",
      labelKo: "\uACBD\uC6B0\uC758 \uC218\xB7\uC21C\uC5F4\xB7\uC870\uD569",
      topicLabel: "\uACBD\uC6B0\uC758 \uC218",
      desc: "\uC21C\uC5F4\uACFC \uC870\uD569 \uC911 \uC5B4\uB290 \uAC83\uC744 \uC4F8\uC9C0 \uD310\uB2E8\uD558\uAC70\uB098 \uC911\uBCF5 \uCC98\uB9AC\uC5D0\uC11C \uC2E4\uC218\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "\uC21C\uC11C\uAC00 \uC911\uC694\uD558\uBA74 \uC21C\uC5F4 P(n,r), \uC21C\uC11C \uBB34\uAD00\uD558\uBA74 \uC870\uD569 C(n,r). \uC911\uBCF5 \uAC00\uB2A5 \uC5EC\uBD80\uB3C4 \uD568\uAED8 \uCCB4\uD06C\uD558\uC138\uC694."
    },
    g3_probability: {
      id: "g3_probability",
      labelKo: "\uD655\uB960 \uACC4\uC0B0",
      topicLabel: "\uD655\uB960",
      desc: "\uC870\uAC74\uBD80\uD655\uB960 \uB610\uB294 \uB3C5\uB9BD\xB7\uC885\uC18D \uC0AC\uAC74\uC758 \uD655\uB960 \uACC4\uC0B0\uC5D0\uC11C \uC624\uB958\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "P(A|B) = P(A\u2229B)/P(B). \uC5EC\uC0AC\uAC74 P(A\u1D9C)=1-P(A)\uB97C \uD65C\uC6A9\uD558\uBA74 \uACC4\uC0B0\uC774 \uD3B8\uD574\uC9C0\uB294 \uACBD\uC6B0\uAC00 \uB9CE\uC2B5\uB2C8\uB2E4."
    },
    g3_statistics: {
      id: "g3_statistics",
      labelKo: "\uD1B5\uACC4 (\uC815\uADDC\uBD84\uD3EC\xB7\uC774\uD56D\uBD84\uD3EC)",
      topicLabel: "\uD1B5\uACC4",
      desc: "\uC815\uADDC\uBD84\uD3EC \uD45C\uC900\uD654\uB098 \uC774\uD56D\uBD84\uD3EC \uACF5\uC2DD \uC801\uC6A9\uC5D0\uC11C \uC2E4\uC218\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "Z=(X-\u03BC)/\u03C3\uB85C \uD45C\uC900\uD654 \uD6C4 \uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uD45C\uB97C \uC77D\uC73C\uC138\uC694. \uC774\uD56D\uBD84\uD3EC B(n,p)\uC758 \uD3C9\uADE0=np, \uBD84\uC0B0=npq."
    },
    // ─── 고3 기하 특화 ───────────────────────────────────────────────
    g3_vector: {
      id: "g3_vector",
      labelKo: "\uBCA1\uD130 \uC5F0\uC0B0",
      topicLabel: "\uBCA1\uD130",
      desc: "\uBCA1\uD130\uC758 \uD569\xB7\uB0B4\uC801\xB7\uD06C\uAE30 \uACC4\uC0B0\uC5D0\uC11C \uC624\uB958\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "\uB0B4\uC801: a\u20D7\xB7b\u20D7 = |a||b|cos\u03B8 = a\u2081b\u2081+a\u2082b\u2082. \uD06C\uAE30: |a\u20D7| = \u221A(a\u2081\xB2+a\u2082\xB2)."
    },
    g3_space_geometry: {
      id: "g3_space_geometry",
      labelKo: "\uACF5\uAC04\uB3C4\uD615\xB7\uC815\uC0AC\uC601",
      topicLabel: "\uACF5\uAC04\uB3C4\uD615",
      desc: "\uACF5\uAC04\uC5D0\uC11C \uC9C1\uC120\xB7\uD3C9\uBA74\uC758 \uC704\uCE58 \uAD00\uACC4\uB098 \uC815\uC0AC\uC601 \uB113\uC774 \uACC4\uC0B0\uC774 \uC5B4\uB835\uC2B5\uB2C8\uB2E4.",
      tip: "\uC815\uC0AC\uC601 \uB113\uC774 = \uC6D0\uB798 \uB113\uC774 \xD7 cos\u03B8 (\u03B8: \uB450 \uD3C9\uBA74\uC774 \uC774\uB8E8\uB294 \uAC01). \uC774\uBA74\uAC01\uC744 \uBA3C\uC800 \uAD6C\uD558\uC138\uC694."
    },
    g1_geometry: {
      id: "g1_geometry",
      labelKo: "\uD3C9\uBA74\uAE30\uD558",
      topicLabel: "\uB3C4\uD615",
      desc: "\uD53C\uD0C0\uACE0\uB77C\uC2A4 \uC815\uB9AC\uB098 \uC0BC\uAC01\uBE44\uB97C \uC774\uC6A9\uD55C \uBCC0\uC758 \uAE38\uC774\xB7\uB113\uC774 \uACC4\uC0B0\uC5D0\uC11C \uC2E4\uC218\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "\uC9C1\uAC01\uC0BC\uAC01\uD615\uC744 \uCC3E\uAC70\uB098 \uBCF4\uC870\uC120\uC73C\uB85C \uB9CC\uB4E4\uC5B4 a\xB2+b\xB2=c\xB2\uC744 \uC801\uC6A9\uD558\uAC70\uB098, sin\u03B8=\uB300\uBCC0/\uBE57\uBCC0\uC73C\uB85C \uAE38\uC774\uB97C \uAD6C\uD558\uC138\uC694."
    },
    g3_function: {
      id: "g3_function",
      labelKo: "\uD568\uC218 \uBD84\uC11D",
      topicLabel: "\uD568\uC218",
      desc: "\uC5ED\uD568\uC218\xB7\uD569\uC131\uD568\uC218 \uACC4\uC0B0\uC774\uB098 \uC804\uC0AC\xB7\uB2E8\uC0AC \uD568\uC218 \uC870\uAC74 \uD310\uB2E8\uC5D0\uC11C \uC624\uB958\uAC00 \uC788\uC5C8\uC2B5\uB2C8\uB2E4.",
      tip: "\uC5ED\uD568\uC218: y=f(x)\uB97C x\uC5D0 \uB300\uD574 \uD480\uC5B4 x=f\u207B\xB9(y). \uD569\uC131\uD568\uC218 (f\u2218g)(x)=f(g(x))\uB294 \uC548\uCABD\uBD80\uD130 \uACC4\uC0B0\uD558\uC138\uC694."
    }
  };
  var weaknessLabelToId = weaknessOrder.reduce(
    (acc, id) => {
      acc[diagnosisMap[id].labelKo] = id;
      return acc;
    },
    {}
  );

  // data/detailedDiagnosisFlows.ts
  var CONTINUE_LABEL = "\uD655\uC778 \uBB38\uC81C\uB85C \uB118\uC5B4\uAC08\uAC8C\uC694";
  var DONT_KNOW_LABEL = "\uBAA8\uB974\uACA0\uC2B5\uB2C8\uB2E4";
  var FINAL_LABEL = "\uC774 \uC57D\uC810\uC73C\uB85C \uC815\uB9AC\uD558\uAE30";
  var methodFallbackWeakness = {
    cps: "formula_understanding",
    vertex: "vertex_formula_memorization",
    diff: "derivative_calculation",
    unknown: "basic_concept_needed",
    factoring: "factoring_pattern_recall",
    quadratic: "quadratic_formula_memorization",
    radical: "radical_simplification_error",
    polynomial: "expansion_sign_error",
    complex_number: "imaginary_unit_confusion",
    remainder_theorem: "remainder_substitution_error",
    counting: "counting_method_confusion",
    set: "g2_set_operation",
    proposition: "g2_prop_contrapositive",
    trig: "g2_trig_unit_circle",
    integral: "g2_integral_basic",
    linear_eq: "g2_inequality_range",
    sequence: "g3_sequence",
    log_exp: "g3_log_exp",
    conic: "g3_conic",
    limit: "g3_limit",
    vector: "g3_vector",
    probability: "g3_probability",
    space_geometry: "g3_space_geometry",
    function: "g3_function",
    statistics: "g3_statistics",
    geometry: "g1_geometry",
    permutation: "g3_counting",
    sequence_limit: "g3_limit",
    integral_advanced: "g3_integral",
    diff_advanced: "g3_diff",
    trig_advanced: "g3_trig"
  };
  var customExplainCopyByChoice = {
    cps_formula: {
      title: "\uC644\uC804\uC81C\uACF1\uC2DD \uD575\uC2EC\uBD80\uD130 \uB2E4\uC2DC \uC9DA\uC5B4\uBCFC\uAC8C\uC694.",
      body: 'x\xB2 + bx\uB97C \uC644\uC804\uC81C\uACF1\uC2DD\uC73C\uB85C \uBC14\uAFC0 \uB54C\uB294 x \uACC4\uC218\uC758 \uC808\uBC18\uC744 \uBA3C\uC800 \uBCF4\uACE0, \uADF8 \uC218\uB97C \uC81C\uACF1\uD574\uC11C \uB354\uD558\uACE0 \uBE7C\uBA74 \uB429\uB2C8\uB2E4.\n\n\uD575\uC2EC\uC740 "\uC808\uBC18\uC744 \uC81C\uACF1\uD55C\uB2E4"\uB294 \uC21C\uC11C\uB97C \uACE0\uC815\uD558\uB294 \uAC70\uC608\uC694.',
      remedialTitle: "\uB354 \uC9E7\uAC8C \uB2E4\uC2DC \uBCFC\uAC8C\uC694.",
      remedialBody: "x\xB2 + bx\uC5D0\uC11C \uD544\uC694\uD55C \uC218\uB294 (b/2)\xB2\uC785\uB2C8\uB2E4.\n\uC608\uB97C \uB4E4\uC5B4 x\xB2 - 6x\uB77C\uBA74 \uC808\uBC18\uC740 -3, \uC81C\uACF1\uD558\uBA74 9\uC608\uC694.\n\uC774 \uD750\uB984\uB9CC \uAE30\uC5B5\uD558\uBA74 \uB429\uB2C8\uB2E4."
    },
    cps_calc: {
      title: "\uC644\uC804\uC81C\uACF1\uC2DD\uC5D0\uC11C\uB294 \uACC4\uC0B0 \uC2E4\uC218\uAC00 \uC790\uC8FC \uB098\uB294 \uC790\uB9AC\uAC00 \uC815\uD574\uC838 \uC788\uC5B4\uC694.",
      body: "\uB354\uD558\uACE0 \uBE80 \uC218\uB97C 0\uC73C\uB85C \uB9DE\uCDB0\uC57C \uC2DD\uC774 \uC720\uC9C0\uB429\uB2C8\uB2E4.\n\uB610 \uB9C8\uC9C0\uB9C9 \uC0C1\uC218\uD56D \uACC4\uC0B0\uC5D0\uC11C \uBD80\uD638\uB97C \uC790\uC8FC \uB193\uCE69\uB2C8\uB2E4.\n\n\uC2DD \uBCC0\uD615\uACFC \uC0C1\uC218\uD56D \uACC4\uC0B0\uC744 \uD55C \uC904\uC529 \uBD84\uB9AC\uD574\uC11C \uBCF4\uB294 \uAC8C \uC911\uC694\uD574\uC694.",
      remedialTitle: "\uACC4\uC0B0 \uD750\uB984\uB9CC \uB2E4\uC2DC \uC881\uD600\uBCFC\uAC8C\uC694.",
      remedialBody: "\uAC19\uC740 \uC218\uB97C \uB354\uD558\uACE0 \uAC19\uC740 \uC218\uB97C \uBE7C\uBA74 \uC804\uCCB4 \uAC12\uC740 \uBC14\uB00C\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.\n\uB9C8\uC9C0\uB9C9\uC5D0\uB294 \uC0C1\uC218\uB07C\uB9AC\uB9CC \uB2E4\uC2DC \uACC4\uC0B0\uD574 \uBCF4\uC138\uC694."
    },
    cps_read: {
      title: "\uC644\uC804\uC81C\uACF1\uC2DD\uC5D0\uC11C\uB294 x\uAC12\uACFC \uCD5C\uC19F\uAC12\uC744 \uB530\uB85C \uC77D\uC5B4\uC57C \uD574\uC694.",
      body: "(x-a)\xB2+b \uD615\uD0DC\uC5D0\uC11C\uB294 \uC81C\uACF1 \uBD80\uBD84\uC758 \uCD5C\uC19F\uAC12\uC774 0\uC774\uACE0, \uC804\uCCB4 \uCD5C\uC19F\uAC12\uC740 b\uC785\uB2C8\uB2E4.\n\na\uB294 \uCD5C\uC19F\uAC12\uC774 \uB418\uB294 x\uC774\uACE0, b\uB294 \uC2E4\uC81C \uCD5C\uC19F\uAC12\uC774\uC5D0\uC694.",
      remedialTitle: "\uB531 \uD55C \uC904\uB85C \uB2E4\uC2DC \uC815\uB9AC\uD560\uAC8C\uC694.",
      remedialBody: '\uC644\uC804\uC81C\uACF1\uC2DD\uC5D0\uC11C a\uB294 \uC704\uCE58, b\uB294 \uAC12\uC785\uB2C8\uB2E4.\n"x = a"\uC640 "\uCD5C\uC19F\uAC12 = b"\uB97C \uBD84\uB9AC\uD574\uC11C \uBCF4\uC138\uC694.'
    },
    vertex_formula: {
      title: "\uAF2D\uC9D3\uC810 \uACF5\uC2DD\uC740 -b/2a \uC21C\uC11C\uB9CC \uD754\uB4E4\uB9AC\uC9C0 \uC54A\uC73C\uBA74 \uB3FC\uC694.",
      body: "\uC774\uCC28\uD568\uC218 ax\xB2 + bx + c\uC5D0\uC11C \uAF2D\uC9D3\uC810\uC758 x\uC88C\uD45C\uB294 -b/2a\uC785\uB2C8\uB2E4.\n\n\uD2B9\uD788 b\uC758 \uBD80\uD638\uB97C \uD3EC\uD568\uD574\uC11C \uC77D\uB294 \uAC83, \uADF8\uB9AC\uACE0 2a\uB85C \uB05D\uAE4C\uC9C0 \uB098\uB204\uB294 \uAC83\uC744 \uC790\uC8FC \uB193\uCE69\uB2C8\uB2E4.",
      remedialTitle: "\uB354 \uC9E7\uAC8C \uAE30\uC5B5\uD574\uBCFC\uAC8C\uC694.",
      remedialBody: "\uBA3C\uC800 b\uB97C \uBD80\uD638 \uD3EC\uD568\uC73C\uB85C \uC801\uACE0, \uADF8\uB2E4\uC74C -b\uB97C \uB9CC\uB4E0 \uB4A4 2a\uB85C \uB098\uB215\uB2C8\uB2E4.\n\uC774 \uC21C\uC11C\uB9CC \uACE0\uC815\uD558\uC138\uC694."
    },
    vertex_sub: {
      title: "\uAF2D\uC9D3\uC810 \uACF5\uC2DD\uC744 \uC4F4 \uB4A4\uC5D0\uB294 x\uB97C \uB2E4\uC2DC f(x)\uC5D0 \uB300\uC785\uD574\uC57C \uD574\uC694.",
      body: "\uAF2D\uC9D3\uC810 \uACF5\uC2DD\uC774 \uC8FC\uB294 \uAC83\uC740 x\uC88C\uD45C\uC785\uB2C8\uB2E4.\n\uC2E4\uC81C \uCD5C\uB313\uAC12\uC774\uB098 \uCD5C\uC19F\uAC12\uC744 \uC5BB\uC73C\uB824\uBA74 \uADF8 x\uB97C \uC6D0\uB798 \uD568\uC218\uC5D0 \uB2E4\uC2DC \uB123\uC5B4\uC57C \uD569\uB2C8\uB2E4.",
      remedialTitle: "\uD575\uC2EC \uB450 \uB2E8\uACC4\uB9CC \uB2E4\uC2DC \uBCFC\uAC8C\uC694.",
      remedialBody: "1) -b/2a\uB85C x\uB97C \uAD6C\uD55C\uB2E4.\n2) \uADF8 x\uB97C f(x)\uC5D0 \uB300\uC785\uD574 \uAC12\uC744 \uAD6C\uD55C\uB2E4.\n\uC5EC\uAE30\uC11C \uBA48\uCD94\uBA74 \uC548 \uB429\uB2C8\uB2E4."
    },
    vertex_coeff: {
      title: "a, b, c\uB294 \uBD80\uD638\uAE4C\uC9C0 \uD3EC\uD568\uD574\uC11C \uC77D\uC5B4\uC57C \uD574\uC694.",
      body: "ax\xB2 + bx + c \uAF34\uC5D0\uC11C a\uB294 x\xB2\uC758 \uACC4\uC218, b\uB294 x\uC758 \uACC4\uC218, c\uB294 \uC0C1\uC218\uD56D\uC785\uB2C8\uB2E4.\n\nb\uAC00 \uC74C\uC218\uBA74 \uADF8\uB300\uB85C \uC74C\uC218\uB85C \uC77D\uC5B4\uC57C \uD569\uB2C8\uB2E4.",
      remedialTitle: "\uAC00\uC7A5 \uB9CE\uC774 \uB193\uCE58\uB294 \uBD80\uBD84\uB9CC \uBCFC\uAC8C\uC694.",
      remedialBody: "b\uB294 x \uC55E\uC758 \uC218\uB97C \uBD80\uD638 \uD3EC\uD568\uC73C\uB85C \uC801\uC2B5\uB2C8\uB2E4.\n\uC608\uB97C \uB4E4\uC5B4 -8x\uBA74 b\uB294 8\uC774 \uC544\uB2C8\uB77C -8\uC785\uB2C8\uB2E4."
    },
    diff_rule: {
      title: "\uBBF8\uBD84\uC740 \uD56D\uB9C8\uB2E4 \uB530\uB85C \uC801\uC6A9\uD558\uBA74 \uD6E8\uC52C \uC548\uC815\uC801\uC774\uC5D0\uC694.",
      body: "x\u207F\uC744 \uBBF8\uBD84\uD558\uBA74 nx\u207F\u207B\xB9\uC774 \uB429\uB2C8\uB2E4.\n\uC0C1\uC218\uD56D\uC740 0\uC774 \uB418\uACE0, \uAC01 \uD56D\uC744 \uB530\uB85C \uBBF8\uBD84\uD55C \uB4A4 \uB2E4\uC2DC \uC815\uB9AC\uD558\uBA74 \uC2E4\uC218\uAC00 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.",
      remedialTitle: "\uBBF8\uBD84 \uADDC\uCE59\uB9CC \uB2E4\uC2DC \uC9E7\uAC8C \uBCFC\uAC8C\uC694.",
      remedialBody: "\uC9C0\uC218\uB294 \uC55E\uC73C\uB85C \uB098\uC624\uACE0, \uC9C0\uC218\uB294 1 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.\n\uC0C1\uC218\uD56D\uC740 \uBBF8\uBD84\uD558\uBA74 0\uC785\uB2C8\uB2E4."
    },
    diff_order: {
      title: "\uBBF8\uBD84 \uD480\uC774\uC5D0\uC11C\uB294 \uC21C\uC11C\uAC00 \uB354 \uC911\uC694\uD574\uC694.",
      body: "\uBCF4\uD1B5 f'(x)=0\uC73C\uB85C \uBA3C\uC800 x\uB97C \uCC3E\uACE0, \uADF8\uB2E4\uC74C \uADF8 x\uB97C \uC6D0\uB798 \uD568\uC218 f(x)\uC5D0 \uB123\uC5B4 \uCD5C\uB313\uAC12\uC774\uB098 \uCD5C\uC19F\uAC12\uC744 \uAD6C\uD569\uB2C8\uB2E4.\n\n\uC911\uAC04\uC5D0 \uBA48\uCD94\uBA74 \uAC12\uC774 \uC544\uB2C8\uB77C \uC704\uCE58\uB9CC \uAD6C\uD55C \uC0C1\uD0DC\uC608\uC694.",
      remedialTitle: "\uBBF8\uBD84 \uD480\uC774 \uC21C\uC11C\uB97C \uB2E4\uC2DC \uC801\uC5B4\uBCFC\uAC8C\uC694.",
      remedialBody: "1) f'(x)=0\n2) x \uAD6C\uD558\uAE30\n3) \uADF8 x\uB97C f(x)\uC5D0 \uB300\uC785\uD558\uAE30\n\uC774 \uC138 \uB2E8\uACC4\uB85C \uBCF4\uBA74 \uB429\uB2C8\uB2E4."
    },
    diff_judge: {
      title: "\uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC740 \uADF8\uB798\uD504 \uBC29\uD5A5\uC744 \uBA3C\uC800 \uBCF4\uBA74 \uB3FC\uC694.",
      body: "\uC774\uCC28\uD568\uC218\uC5D0\uC11C\uB294 a\uC758 \uBD80\uD638\uB97C \uBCF4\uBA74 \uC704\uB85C \uBCFC\uB85D\uC778\uC9C0 \uC544\uB798\uB85C \uBCFC\uB85D\uC778\uC9C0 \uC54C \uC218 \uC788\uC2B5\uB2C8\uB2E4.\n\n\uC704\uB85C \uBCFC\uB85D\uC774\uBA74 \uCD5C\uC19F\uAC12, \uC544\uB798\uB85C \uBCFC\uB85D\uC774\uBA74 \uCD5C\uB313\uAC12\uC774\uC5D0\uC694.",
      remedialTitle: "\uD310\uB2E8 \uAE30\uC900\uB9CC \uB2E4\uC2DC \uBCFC\uAC8C\uC694.",
      remedialBody: "a > 0\uC774\uBA74 \uCD5C\uC19F\uAC12, a < 0\uC774\uBA74 \uCD5C\uB313\uAC12\uC785\uB2C8\uB2E4.\n\uAC12\uC744 \uACC4\uC0B0\uD558\uAE30 \uC804\uC5D0 \uC774 \uD310\uB2E8\uBD80\uD130 \uBA3C\uC800 \uD558\uC138\uC694."
    },
    unknown_basic: {
      title: "\uC9C0\uAE08\uC740 \uD480\uC774 \uC774\uB984\uBCF4\uB2E4 \uC2DC\uC791\uC810\uC774 \uB354 \uC911\uC694\uD574\uC694.",
      body: '\uAD1C\uCC2E\uC544\uC694. \uC544\uC9C1 \uBC29\uBC95 \uC774\uB984\uC774 \uC548 \uB5A0\uC624\uB97C \uC218 \uC788\uC2B5\uB2C8\uB2E4.\n\uC774\uB7F4 \uB54C\uB294 "\uBB34\uC5C7\uC744 \uBA3C\uC800 \uAD6C\uD574\uC57C \uD558\uB294\uC9C0"\uBD80\uD130 \uC7A1\uC544\uBCF4\uB294 \uAC8C \uC88B\uC2B5\uB2C8\uB2E4.',
      remedialTitle: "\uB354 \uC26C\uC6B4 \uAE30\uC900\uC73C\uB85C \uB2E4\uC2DC \uBCFC\uAC8C\uC694.",
      remedialBody: "\uBC29\uBC95 \uC774\uB984\uC740 \uBAB0\uB77C\uB3C4 \uB429\uB2C8\uB2E4.\n\uBA3C\uC800 x\uB97C \uAD6C\uD558\uB294\uC9C0, \uC2DD\uC744 \uBC14\uAFB8\uB294\uC9C0, \uAC12\uC744 \uB300\uC785\uD558\uB294\uC9C0\uBD80\uD130 \uB5A0\uC62C\uB824 \uBCF4\uC138\uC694."
    },
    unknown_calc: {
      title: "\uBC29\uD5A5\uC740 \uB9DE\uB294\uB370 \uACC4\uC0B0\uC774 \uD754\uB4E4\uB9AC\uB294 \uC0C1\uD0DC\uB85C \uBCF4\uC5EC\uC694.",
      body: "\uC774 \uACBD\uC6B0\uC5D0\uB294 \uAC1C\uB150\uC774 \uC644\uC804\uD788 \uC5C6\uB294 \uAC83\uC774 \uC544\uB2C8\uB77C, \uC911\uAC04 \uACC4\uC0B0\uACFC \uBD80\uD638 \uCC98\uB9AC\uC5D0\uC11C \uC790\uC8FC \uD754\uB4E4\uB9AC\uB294 \uD328\uD134\uC77C \uAC00\uB2A5\uC131\uC774 \uD07D\uB2C8\uB2E4.",
      remedialTitle: "\uACC4\uC0B0 \uCABD\uB9CC \uB2E4\uC2DC \uC881\uD600\uBCFC\uAC8C\uC694.",
      remedialBody: "\uC2DD\uC744 \uD55C \uC904\uC529 \uB098\uB204\uACE0, \uC74C\uC218 \uACC4\uC0B0\uC774\uB098 \uBD84\uC218 \uACC4\uC0B0 \uAD6C\uAC04\uB9CC \uB530\uB85C \uAC80\uC0B0\uD574 \uBCF4\uC138\uC694."
    },
    unknown_read: {
      title: "\uAC12\uC744 \uC77D\uB294 \uD574\uC11D \uB2E8\uACC4\uC5D0\uC11C \uD754\uB4E4\uB9AC\uB294 \uACBD\uC6B0\uAC00 \uB9CE\uC544\uC694.",
      body: "\uBB38\uC81C\uC5D0\uC11C \uBB3B\uB294 \uAC83\uC774 x\uAC12\uC778\uC9C0, \uD568\uC218\uAC12\uC778\uC9C0, \uCD5C\uB313\uAC12\uC778\uC9C0 \uCD5C\uC19F\uAC12\uC778\uC9C0 \uAD6C\uBD84\uD558\uB294 \uB2E8\uACC4\uAC00 \uD750\uB824\uC9C0\uBA74 \uB9C8\uC9C0\uB9C9\uC5D0 \uD2C0\uB9AC\uAE30 \uC27D\uC2B5\uB2C8\uB2E4.",
      remedialTitle: "\uC9C8\uBB38\uC774 \uBB34\uC5C7\uC778\uC9C0\uBD80\uD130 \uB2E4\uC2DC \uBCFC\uAC8C\uC694.",
      remedialBody: '\uBB38\uC81C\uC5D0\uC11C \uAD6C\uD558\uB294 \uB300\uC0C1\uC774 "x"\uC778\uC9C0 "\uAC12"\uC778\uC9C0 \uBA3C\uC800 \uCCB4\uD06C\uD558\uACE0, \uB9C8\uC9C0\uB9C9 \uC904\uC5D0 \uADF8 \uAC12\uC744 \uB530\uB85C \uC801\uC5B4\uBCF4\uC138\uC694.'
    }
  };
  var checkPromptByWeakness = {
    formula_understanding: {
      title: "\uC644\uC804\uC81C\uACF1\uC2DD \uD575\uC2EC \uD655\uC778",
      prompt: "x\xB2 - 6x\uB97C \uC644\uC804\uC81C\uACF1\uC2DD\uC73C\uB85C \uB9CC\uB4E4 \uB54C \uB354\uD558\uACE0 \uBE7C\uC57C \uD558\uB294 \uC218\uB294?",
      options: [
        { id: "correct", text: "9", isCorrect: true },
        { id: "half", text: "6", isCorrect: false },
        { id: "square", text: "36", isCorrect: false }
      ]
    },
    calc_repeated_error: {
      title: "\uACC4\uC0B0 \uC2E4\uC218 \uD3EC\uC778\uD2B8 \uD655\uC778",
      prompt: "9 - 18 + 10\uC744 \uACC4\uC0B0\uD558\uBA74?",
      options: [
        { id: "correct", text: "1", isCorrect: true },
        { id: "wrong_sign", text: "19", isCorrect: false },
        { id: "skip_step", text: "7", isCorrect: false }
      ]
    },
    min_value_read_confusion: {
      title: "\uCD5C\uC19F\uAC12 \uC77D\uAE30 \uD655\uC778",
      prompt: "(x - 3)\xB2 + 2\uC5D0\uC11C \uCD5C\uC19F\uAC12\uC740?",
      options: [
        { id: "correct", text: "2", isCorrect: true },
        { id: "x_value", text: "3", isCorrect: false },
        { id: "square", text: "0", isCorrect: false }
      ]
    },
    vertex_formula_memorization: {
      title: "\uAF2D\uC9D3\uC810 \uACF5\uC2DD \uD655\uC778",
      prompt: "f(x) = x\xB2 - 8x + 1\uC77C \uB54C \uAF2D\uC9D3\uC810\uC758 x\uC88C\uD45C\uB294?",
      options: [
        { id: "correct", text: "4", isCorrect: true },
        { id: "miss_sign", text: "-4", isCorrect: false },
        { id: "no_divide", text: "8", isCorrect: false }
      ]
    },
    coefficient_sign_confusion: {
      title: "\uACC4\uC218 \uC77D\uAE30 \uD655\uC778",
      prompt: "f(x) = 2x\xB2 - 8x + 3\uC5D0\uC11C b\uB294?",
      options: [
        { id: "correct", text: "-8", isCorrect: true },
        { id: "drop_sign", text: "8", isCorrect: false },
        { id: "wrong_term", text: "3", isCorrect: false }
      ]
    },
    derivative_calculation: {
      title: "\uBBF8\uBD84 \uADDC\uCE59 \uD655\uC778",
      prompt: "f(x) = x\xB2 - 6x + 3\uC744 \uBBF8\uBD84\uD558\uBA74?",
      options: [
        { id: "correct", text: "2x - 6", isCorrect: true },
        { id: "constant", text: "2x - 6 + 3", isCorrect: false },
        { id: "power", text: "x - 6", isCorrect: false }
      ]
    },
    solving_order_confusion: {
      title: "\uD480\uC774 \uC21C\uC11C \uD655\uC778",
      prompt: "f'(x)=0\uC73C\uB85C x\uB97C \uAD6C\uD55C \uB4A4 \uB2E4\uC74C\uC73C\uB85C \uD574\uC57C \uD558\uB294 \uAC83\uC740?",
      options: [
        { id: "correct", text: "\uADF8 x\uB97C f(x)\uC5D0 \uB300\uC785\uD574 \uAC12 \uAD6C\uD558\uAE30", isCorrect: true },
        { id: "stop", text: "\uAC70\uAE30\uC11C \uBC14\uB85C \uCD5C\uB313\uAC12\uC774\uB77C\uACE0 \uACB0\uB860\uB0B4\uAE30", isCorrect: false },
        { id: "differentiate", text: "\uD55C \uBC88 \uB354 \uBBF8\uBD84\uD558\uAE30", isCorrect: false }
      ]
    },
    max_min_judgement_confusion: {
      title: "\uCD5C\uB313\uAC12/\uCD5C\uC19F\uAC12 \uD310\uB2E8 \uD655\uC778",
      prompt: "\uC774\uCC28\uD568\uC218\uC5D0\uC11C a < 0\uC774\uBA74 \uADF8\uB798\uD504\uB294?",
      options: [
        { id: "correct", text: "\uC704\uB85C \uBCFC\uB85D\uC774\uB77C \uCD5C\uB313\uAC12\uC744 \uAC00\uC9C4\uB2E4", isCorrect: true },
        { id: "min", text: "\uC544\uB798\uB85C \uBCFC\uB85D\uC774\uB77C \uCD5C\uC19F\uAC12\uC744 \uAC00\uC9C4\uB2E4", isCorrect: false },
        { id: "none", text: "\uCD5C\uB313\uAC12\uB3C4 \uCD5C\uC19F\uAC12\uB3C4 \uC5C6\uB2E4", isCorrect: false }
      ]
    },
    basic_concept_needed: {
      title: "\uD604\uC7AC \uC0C1\uD0DC \uB2E4\uC2DC \uD655\uC778",
      prompt: "\uC9C0\uAE08 \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uC0C1\uD0DC\uB294?",
      options: [
        { id: "correct", text: "\uC2DC\uC791 \uBC29\uBC95 \uC790\uCCB4\uAC00 \uC544\uC9C1 \uC798 \uC548 \uB5A0\uC62C\uB77C\uC694", isCorrect: true },
        { id: "calc", text: "\uBC29\uD5A5\uC740 \uC54C\uACA0\uB294\uB370 \uACC4\uC0B0\uC5D0\uC11C\uB9CC \uD2C0\uB824\uC694", isCorrect: false },
        { id: "read", text: "\uB9C8\uC9C0\uB9C9\uC5D0 \uAC12\uC744 \uC77D\uB294 \uAC83\uB9CC \uD5F7\uAC08\uB824\uC694", isCorrect: false }
      ]
    },
    factoring_pattern_recall: {
      title: "\uC778\uC218\uBD84\uD574 \uD328\uD134 \uD655\uC778",
      prompt: "x\xB2 - 5x + 6\uC744 \uC778\uC218\uBD84\uD574\uD558\uBA74?",
      options: [
        { id: "correct", text: "(x-2)(x-3)", isCorrect: true },
        { id: "sign", text: "(x+2)(x+3)", isCorrect: false },
        { id: "wrong_pair", text: "(x-1)(x-6)", isCorrect: false }
      ]
    },
    complex_factoring_difficulty: {
      title: "\uBCF5\uC7A1\uD55C \uC778\uC218\uBD84\uD574 \uD655\uC778",
      prompt: "x\xB3 - 4x\uB97C \uBB36\uC73C\uBA74?",
      options: [
        { id: "correct", text: "x(x\xB2-4)", isCorrect: true },
        { id: "drop", text: "x\xB2-4", isCorrect: false },
        { id: "sign", text: "x(x\xB2+4)", isCorrect: false }
      ]
    },
    quadratic_formula_memorization: {
      title: "\uADFC\uC758 \uACF5\uC2DD \uD655\uC778",
      prompt: "\uADFC\uC758 \uACF5\uC2DD\uC5D0\uC11C \uBD84\uBAA8\uB294 \uBB34\uC5C7\uC778\uAC00\uC694?",
      options: [
        { id: "correct", text: "2a", isCorrect: true },
        { id: "b", text: "b", isCorrect: false },
        { id: "square", text: "b\xB2", isCorrect: false }
      ]
    },
    discriminant_calculation: {
      title: "\uD310\uBCC4\uC2DD \uD655\uC778",
      prompt: "ax\xB2 + bx + c\uC758 \uD310\uBCC4\uC2DD\uC740?",
      options: [
        { id: "correct", text: "b\xB2 - 4ac", isCorrect: true },
        { id: "sign", text: "b\xB2 + 4ac", isCorrect: false },
        { id: "missing", text: "b - 4ac", isCorrect: false }
      ]
    },
    radical_simplification_error: {
      title: "\uB8E8\uD2B8 \uAC04\uC18C\uD654 \uD655\uC778",
      prompt: "\u221A75\uB97C \uAC04\uB2E8\uD788 \uD558\uBA74?",
      options: [
        { id: "correct", text: "5\u221A3", isCorrect: true },
        { id: "wrong_factor", text: "\u221A25 + \u221A3", isCorrect: false },
        { id: "keep", text: "15\u221A5", isCorrect: false }
      ]
    },
    rationalization_error: {
      title: "\uC720\uB9AC\uD654 \uD655\uC778",
      prompt: "6/\u221A3\uC744 \uC720\uB9AC\uD654\uD558\uBA74?",
      options: [
        { id: "correct", text: "2\u221A3", isCorrect: true },
        { id: "half", text: "3\u221A3", isCorrect: false },
        { id: "keep", text: "6\u221A3", isCorrect: false }
      ]
    },
    expansion_sign_error: {
      title: "\uC804\uAC1C \uBD80\uD638 \uD655\uC778",
      prompt: "(x-2)(x+3)\uC744 \uC804\uAC1C\uD558\uBA74?",
      options: [
        { id: "correct", text: "x\xB2 + x - 6", isCorrect: true },
        { id: "sign", text: "x\xB2 - x - 6", isCorrect: false },
        { id: "middle", text: "x\xB2 + 5x - 6", isCorrect: false }
      ]
    },
    like_terms_error: {
      title: "\uB3D9\uB958\uD56D \uC815\uB9AC \uD655\uC778",
      prompt: "2x + 3x - x\uB97C \uC815\uB9AC\uD558\uBA74?",
      options: [
        { id: "correct", text: "4x", isCorrect: true },
        { id: "drop", text: "5x", isCorrect: false },
        { id: "sign", text: "2x", isCorrect: false }
      ]
    },
    imaginary_unit_confusion: {
      title: "\uD5C8\uC218 \uB2E8\uC704 \uD655\uC778",
      prompt: "i\xB2\uC758 \uAC12\uC740?",
      options: [
        { id: "correct", text: "-1", isCorrect: true },
        { id: "identity", text: "1", isCorrect: false },
        { id: "imaginary", text: "i", isCorrect: false }
      ]
    },
    complex_calc_error: {
      title: "\uBCF5\uC18C\uC218 \uC815\uB9AC \uD655\uC778",
      prompt: "(2 + i) + (3 - 2i)\uB97C \uC815\uB9AC\uD558\uBA74?",
      options: [
        { id: "correct", text: "5 - i", isCorrect: true },
        { id: "drop", text: "5 + i", isCorrect: false },
        { id: "sign", text: "-1 + i", isCorrect: false }
      ]
    },
    remainder_substitution_error: {
      title: "\uB098\uBA38\uC9C0\uC815\uB9AC \uD655\uC778",
      prompt: "P(x)\uB97C x-2\uB85C \uB098\uB20C \uB54C \uB098\uBA38\uC9C0\uB294?",
      options: [
        { id: "correct", text: "P(2)", isCorrect: true },
        { id: "neg", text: "P(-2)", isCorrect: false },
        { id: "zero", text: "P(0)", isCorrect: false }
      ]
    },
    simultaneous_equation_error: {
      title: "\uC870\uAC74 \uC815\uB9AC \uD655\uC778",
      prompt: "\uB450 \uC870\uAC74\uC774 \uC8FC\uC5B4\uC84C\uC744 \uB54C \uBA3C\uC800 \uD574\uC57C \uD558\uB294 \uAC83\uC740?",
      options: [
        { id: "correct", text: "\uC2DD \uB450 \uAC1C\uB97C \uB530\uB85C \uC138\uC6B4 \uB4A4 \uC5F0\uB9BD\uC73C\uB85C \uBB36\uAE30", isCorrect: true },
        { id: "guess", text: "\uAC12\uC744 \uAC10\uC73C\uB85C \uB123\uC5B4 \uBCF4\uAE30", isCorrect: false },
        { id: "skip", text: "\uD55C \uC2DD\uB9CC\uC73C\uB85C \uBC14\uB85C \uACB0\uB860\uB0B4\uAE30", isCorrect: false }
      ]
    },
    counting_method_confusion: {
      title: "\uACBD\uC6B0\uC758 \uC218 \uBC29\uBC95 \uD655\uC778",
      prompt: "\uC21C\uC11C\uAC00 \uC911\uC694\uD558\uC9C0 \uC54A\uC744 \uB54C \uBA3C\uC800 \uB5A0\uC62C\uB9B4 \uBC29\uBC95\uC740?",
      options: [
        { id: "correct", text: "\uC870\uD569", isCorrect: true },
        { id: "perm", text: "\uC21C\uC5F4", isCorrect: false },
        { id: "none", text: "\uC544\uBB34 \uAE30\uC900 \uC5C6\uC774 \uC804\uBD80 \uB098\uC5F4", isCorrect: false }
      ]
    },
    counting_overcounting: {
      title: "\uC911\uBCF5 \uCC98\uB9AC \uD655\uC778",
      prompt: "\uAC19\uC740 \uACBD\uC6B0\uB97C \uB450 \uBC88 \uC138\uC9C0 \uC54A\uC73C\uB824\uBA74 \uBB34\uC5C7\uC774 \uC911\uC694\uD560\uAE4C\uC694?",
      options: [
        { id: "correct", text: "\uAE30\uC900\uC744 \uC815\uD558\uACE0 \uD55C \uBC88\uB9CC \uC138\uAE30", isCorrect: true },
        { id: "double", text: "\uC911\uBCF5\uC774\uC5B4\uB3C4 \uBA3C\uC800 \uB2E4 \uB354\uD558\uAE30", isCorrect: false },
        { id: "ignore", text: "\uC870\uAC74\uC740 \uB9C8\uC9C0\uB9C9\uC5D0 \uD55C \uBC88\uB9CC \uBCF4\uAE30", isCorrect: false }
      ]
    },
    g3_sequence: {
      title: "\uC218\uC5F4 \uACF5\uC2DD \uD655\uC778",
      prompt: "\uB4F1\uCC28\uC218\uC5F4 {a\u2099}\uC5D0\uC11C a\u2081=2, \uACF5\uCC28 d=3\uC77C \uB54C a\u2085\uB294?",
      options: [
        { id: "correct", text: "14", isCorrect: true },
        { id: "wrong1", text: "12", isCorrect: false },
        { id: "wrong2", text: "17", isCorrect: false }
      ]
    },
    g3_log_exp: {
      title: "\uB85C\uADF8 \uACC4\uC0B0 \uD655\uC778",
      prompt: "log\u20828\uC758 \uAC12\uC740?",
      options: [
        { id: "correct", text: "3", isCorrect: true },
        { id: "wrong1", text: "4", isCorrect: false },
        { id: "wrong2", text: "2", isCorrect: false }
      ]
    },
    g3_conic: {
      title: "\uC774\uCC28\uACE1\uC120 \uCD08\uC810 \uD655\uC778",
      prompt: "\uD3EC\uBB3C\uC120 y\xB2=8x\uC758 \uCD08\uC810\uC758 x\uC88C\uD45C\uB294?",
      options: [
        { id: "correct", text: "2", isCorrect: true },
        { id: "wrong1", text: "4", isCorrect: false },
        { id: "wrong2", text: "8", isCorrect: false }
      ]
    },
    g3_limit: {
      title: "\uADF9\uD55C\uAC12 \uD655\uC778",
      prompt: "lim(x\u2192\u221E) (2x+1)/x\uC758 \uAC12\uC740?",
      options: [
        { id: "correct", text: "2", isCorrect: true },
        { id: "wrong1", text: "1", isCorrect: false },
        { id: "wrong2", text: "\u221E", isCorrect: false }
      ]
    },
    g3_vector: {
      title: "\uBCA1\uD130 \uB0B4\uC801 \uD655\uC778",
      prompt: "\uBCA1\uD130 a=(3,4), b=(1,0)\uC77C \uB54C a\xB7b\uB294?",
      options: [
        { id: "correct", text: "3", isCorrect: true },
        { id: "wrong1", text: "7", isCorrect: false },
        { id: "wrong2", text: "4", isCorrect: false }
      ]
    },
    g3_probability: {
      title: "\uC870\uAC74\uBD80\uD655\uB960 \uD655\uC778",
      prompt: "P(A)=0.4, P(A\u2229B)=0.2\uC77C \uB54C P(B|A)\uB294?",
      options: [
        { id: "correct", text: "0.5", isCorrect: true },
        { id: "wrong1", text: "0.2", isCorrect: false },
        { id: "wrong2", text: "0.8", isCorrect: false }
      ]
    },
    g3_space_geometry: {
      title: "\uC815\uC0AC\uC601 \uAC1C\uB150 \uD655\uC778",
      prompt: "\uD3C9\uBA74\uC5D0 \uC218\uC9C1\uC73C\uB85C \uC138\uC6B4 \uC120\uBD84\uC758 \uC815\uC0AC\uC601 \uAE38\uC774\uB294?",
      options: [
        { id: "correct", text: "0", isCorrect: true },
        { id: "wrong1", text: "\uC6D0\uB798 \uAE38\uC774", isCorrect: false },
        { id: "wrong2", text: "\uBC18", isCorrect: false }
      ]
    },
    g3_function: {
      title: "\uC5ED\uD568\uC218 \uD655\uC778",
      prompt: "f(x)=3x-1\uC77C \uB54C f\u207B\xB9(5)\uB294?",
      options: [
        { id: "correct", text: "2", isCorrect: true },
        { id: "wrong1", text: "14", isCorrect: false },
        { id: "wrong2", text: "6", isCorrect: false }
      ]
    },
    g3_statistics: {
      title: "\uC815\uADDC\uBD84\uD3EC \uD45C\uC900\uD654 \uD655\uC778",
      prompt: "X~N(50, 4\xB2)\uC77C \uB54C P(X\u226458)\uC744 \uAD6C\uD558\uB824\uBA74 \uD45C\uC900\uD654 Z\uB294?",
      options: [
        { id: "correct", text: "Z=2", isCorrect: true },
        { id: "wrong1", text: "Z=1.5", isCorrect: false },
        { id: "wrong2", text: "Z=8", isCorrect: false }
      ]
    },
    g1_geometry: {
      title: "\uD53C\uD0C0\uACE0\uB77C\uC2A4 \uC815\uB9AC \uD655\uC778",
      prompt: "\uC9C1\uAC01\uC0BC\uAC01\uD615\uC5D0\uC11C \uB450 \uBCC0\uC774 3, 4\uC77C \uB54C \uBE57\uBCC0\uC758 \uAE38\uC774\uB294?",
      options: [
        { id: "correct", text: "5", isCorrect: true },
        { id: "wrong1", text: "7", isCorrect: false },
        { id: "wrong2", text: "\u221A7", isCorrect: false }
      ]
    },
    g3_counting: {
      title: "\uC21C\uC5F4\xB7\uC870\uD569 \uAD6C\uBD84 \uD655\uC778",
      prompt: "5\uBA85 \uC911 \uB300\uD45C 2\uBA85\uC744 \uBF51\uC744 \uB54C (\uC21C\uC11C \uBB34\uAD00) \uACBD\uC6B0\uC758 \uC218\uB294?",
      options: [
        { id: "correct", text: "10", isCorrect: true },
        { id: "wrong1", text: "20", isCorrect: false },
        { id: "wrong2", text: "5", isCorrect: false }
      ]
    },
    g3_integral: {
      title: "\uC815\uC801\uBD84 \uACC4\uC0B0 \uD655\uC778",
      prompt: "\u222B\u2080\xB2 2x dx\uC758 \uAC12\uC740?",
      options: [
        { id: "correct", text: "4", isCorrect: true },
        { id: "wrong1", text: "2", isCorrect: false },
        { id: "wrong2", text: "8", isCorrect: false }
      ]
    },
    g3_diff: {
      title: "\uD569\uC131\uD568\uC218 \uBBF8\uBD84 \uD655\uC778",
      prompt: "f(x)=(2x+1)\xB3\uC744 \uBBF8\uBD84\uD558\uBA74?",
      options: [
        { id: "correct", text: "6(2x+1)\xB2", isCorrect: true },
        { id: "wrong1", text: "3(2x+1)\xB2", isCorrect: false },
        { id: "wrong2", text: "2(2x+1)\xB3", isCorrect: false }
      ]
    }
  };
  var _requiredCheckNodeWeaknesses = [
    "g3_sequence",
    "g3_log_exp",
    "g3_conic",
    "g3_limit",
    "g3_vector",
    "g3_probability",
    "g3_space_geometry",
    "g3_function",
    "g3_statistics",
    "g1_geometry",
    "g3_counting",
    "g3_integral",
    "g3_diff"
  ];
  _requiredCheckNodeWeaknesses.forEach((id) => {
    if (!(id in checkPromptByWeakness)) {
      throw new Error(`[detailedDiagnosisFlows] checkPromptByWeakness missing entry: ${id}`);
    }
  });
  function getMethodLabel(methodId) {
    return methodOptions.find((option) => option.id === methodId)?.labelKo ?? methodId;
  }
  function buildDefaultExplainCopy(methodId, choiceId, weaknessId) {
    const custom = customExplainCopyByChoice[choiceId];
    if (custom) {
      return custom;
    }
    const weakness = diagnosisMap[weaknessId];
    const methodLabel = getMethodLabel(methodId);
    return {
      title: `${methodLabel} \uD480\uC774\uB97C \uB354 \uC9E7\uAC8C \uC815\uB9AC\uD574\uBCFC\uAC8C\uC694.`,
      body: `${weakness.desc}

\uD575\uC2EC \uD301: ${weakness.tip}`,
      remedialTitle: "\uB354 \uC26C\uC6B4 \uC124\uBA85\uC73C\uB85C \uB2E4\uC2DC \uBCFC\uAC8C\uC694.",
      remedialBody: `${methodLabel} \uD480\uC774\uC5D0\uC11C\uB294 \uC774 \uC9C0\uC810\uC744 \uBA3C\uC800 \uC548\uC815\uC2DC\uD0A4\uB294 \uAC83\uC774 \uC911\uC694\uD574\uC694.

${weakness.tip}`
    };
  }
  function buildFinalNode(nodeId, weaknessId, emphasis) {
    const weakness = diagnosisMap[weaknessId];
    return {
      id: nodeId,
      kind: "final",
      weaknessId,
      title: emphasis ?? `${weakness.labelKo} \uCABD \uBCF4\uC644\uC774 \uAC00\uC7A5 \uBA3C\uC800 \uD544\uC694\uD574 \uBCF4\uC5EC\uC694.`,
      body: `${weakness.desc}

\uB2E4\uC74C \uD301: ${weakness.tip}`,
      ctaLabel: FINAL_LABEL
    };
  }
  function buildCheckNode(nodeId, weaknessId, onCorrectNextNodeId, onWrongNextNodeId) {
    const definition = checkPromptByWeakness[weaknessId];
    return {
      id: nodeId,
      kind: "check",
      title: definition.title,
      prompt: definition.prompt,
      options: definition.options.map((option) => ({
        ...option,
        nextNodeId: option.isCorrect ? onCorrectNextNodeId : onWrongNextNodeId,
        weaknessId: option.isCorrect ? void 0 : weaknessId
      })),
      dontKnowNextNodeId: onWrongNextNodeId
    };
  }
  function createMethodFlow(methodId) {
    const definition = diagnosisTree[methodId];
    const methodLabel = getMethodLabel(methodId);
    const fallbackWeaknessId = methodFallbackWeakness[methodId];
    const nodes = {};
    nodes.root = {
      id: "root",
      kind: "choice",
      title: definition.prompt,
      body: methodId === "unknown" ? "\uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uC0C1\uD0DC\uB97C \uACE0\uB974\uBA74, \uADF8\uB2E4\uC74C \uC9C8\uBB38\uC744 \uB354 \uAD6C\uCCB4\uC801\uC73C\uB85C \uC881\uD600\uBCFC\uAC8C\uC694." : `\uB9C9\uD78C \uC9C0\uC810\uC744 \uD558\uB098 \uACE0\uB974\uBA74 ${methodLabel} \uD480\uC774\uB97C \uB354 \uC790\uC138\uD788 \uC9DA\uC5B4\uBCFC\uAC8C\uC694.`,
      options: definition.choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
        nextNodeId: `${choice.id}_explain`,
        weaknessId: choice.weaknessId
      }))
    };
    definition.choices.forEach((choice) => {
      const hasCheckNode = choice.weaknessId in checkPromptByWeakness;
      const explainCopy = buildDefaultExplainCopy(methodId, choice.id, choice.weaknessId);
      const finalNodeId = `${choice.id}_final`;
      const fallbackFinalNodeId = `${choice.id}_fallback_final`;
      nodes[`${choice.id}_explain`] = {
        id: `${choice.id}_explain`,
        kind: "explain",
        title: explainCopy.title,
        body: explainCopy.body,
        primaryLabel: CONTINUE_LABEL,
        primaryNextNodeId: hasCheckNode ? `${choice.id}_check` : finalNodeId,
        secondaryLabel: DONT_KNOW_LABEL,
        secondaryNextNodeId: hasCheckNode ? `${choice.id}_remedial` : fallbackFinalNodeId
      };
      if (hasCheckNode) {
        nodes[`${choice.id}_remedial`] = {
          id: `${choice.id}_remedial`,
          kind: "explain",
          title: explainCopy.remedialTitle,
          body: explainCopy.remedialBody,
          primaryLabel: CONTINUE_LABEL,
          primaryNextNodeId: `${choice.id}_retry_check`,
          secondaryLabel: DONT_KNOW_LABEL,
          secondaryNextNodeId: fallbackFinalNodeId
        };
        nodes[`${choice.id}_check`] = buildCheckNode(
          `${choice.id}_check`,
          choice.weaknessId,
          finalNodeId,
          `${choice.id}_remedial`
        );
        nodes[`${choice.id}_retry_check`] = buildCheckNode(
          `${choice.id}_retry_check`,
          choice.weaknessId,
          finalNodeId,
          fallbackFinalNodeId
        );
      }
      nodes[finalNodeId] = buildFinalNode(finalNodeId, choice.weaknessId);
      nodes[fallbackFinalNodeId] = buildFinalNode(
        fallbackFinalNodeId,
        fallbackWeaknessId,
        `${methodLabel} \uD480\uC774\uC758 \uAE30\uCD08\uB97C \uBA3C\uC800 \uB2E4\uC9C0\uB294 \uAC83\uC774 \uC88B\uC544 \uBCF4\uC5EC\uC694.`
      );
    });
    return {
      methodId,
      startNodeId: "root",
      nodes
    };
  }
  var flowEntries = methodOptions.map((option) => [option.id, createMethodFlow(option.id)]);
  var detailedDiagnosisFlows = Object.fromEntries(flowEntries);

  // features/quiz/diagnosis-flow-engine.ts
  function appendVisitedNode(draft, nodeId) {
    if (draft.visitedNodeIds[draft.visitedNodeIds.length - 1] === nodeId) {
      return draft.visitedNodeIds;
    }
    return [...draft.visitedNodeIds, nodeId];
  }
  function getDiagnosisFlow(methodId) {
    const flow = detailedDiagnosisFlows[methodId];
    if (!flow) {
      throw new Error(`Diagnosis flow not found for method: ${methodId}`);
    }
    return flow;
  }
  function getNode(flow, nodeId) {
    const node = flow.nodes[nodeId];
    if (!node) {
      throw new Error(`Diagnosis flow node not found: ${flow.methodId}/${nodeId}`);
    }
    return node;
  }
  function createDiagnosisFlowDraft(methodId) {
    const flow = getDiagnosisFlow(methodId);
    return {
      methodId,
      flowId: flow.methodId,
      currentNodeId: flow.startNodeId,
      visitedNodeIds: [flow.startNodeId],
      events: [],
      usedDontKnow: false,
      usedAiHelp: false
    };
  }
  function appendEvent(draft, event, options) {
    return {
      ...draft,
      events: [...draft.events, event],
      usedAiHelp: draft.usedAiHelp || Boolean(options?.usedAiHelp)
    };
  }
  function advanceFromChoice(draft, optionId) {
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== "choice") {
      throw new Error(`advanceFromChoice expected choice node, got ${node.kind}`);
    }
    const choiceNode = node;
    const option = choiceNode.options.find((item) => item.id === optionId);
    if (!option) {
      throw new Error(`Choice option not found: ${draft.methodId}/${draft.currentNodeId}/${optionId}`);
    }
    return {
      ...draft,
      currentNodeId: option.nextNodeId,
      visitedNodeIds: appendVisitedNode(draft, option.nextNodeId),
      events: appendEvent(draft, {
        kind: "branch",
        nodeId: choiceNode.id,
        optionId: option.id,
        weaknessId: option.weaknessId
      }).events
    };
  }
  function advanceFromExplain(draft, action) {
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== "explain") {
      throw new Error(`advanceFromExplain expected explain node, got ${node.kind}`);
    }
    const explainNode = node;
    const nextNodeId = action === "continue" ? explainNode.primaryNextNodeId : explainNode.secondaryNextNodeId;
    return {
      ...draft,
      currentNodeId: nextNodeId,
      visitedNodeIds: appendVisitedNode(draft, nextNodeId),
      usedDontKnow: draft.usedDontKnow || action === "dont_know",
      events: appendEvent(
        draft,
        action === "continue" ? { kind: "explain_continue", nodeId: explainNode.id } : { kind: "dont_know", nodeId: explainNode.id }
      ).events
    };
  }
  function advanceFromCheck(draft, optionId) {
    const flow = getDiagnosisFlow(draft.methodId);
    const node = getNode(flow, draft.currentNodeId);
    if (node.kind !== "check") {
      throw new Error(`advanceFromCheck expected check node, got ${node.kind}`);
    }
    const checkNode = node;
    if (!optionId) {
      const nextNodeId = checkNode.dontKnowNextNodeId;
      return {
        ...draft,
        currentNodeId: nextNodeId,
        visitedNodeIds: appendVisitedNode(draft, nextNodeId),
        usedDontKnow: true,
        events: appendEvent(draft, { kind: "dont_know", nodeId: checkNode.id }).events
      };
    }
    const option = checkNode.options.find((item) => item.id === optionId);
    if (!option) {
      throw new Error(`Check option not found: ${draft.methodId}/${draft.currentNodeId}/${optionId}`);
    }
    return {
      ...draft,
      currentNodeId: option.nextNodeId,
      visitedNodeIds: appendVisitedNode(draft, option.nextNodeId),
      events: appendEvent(draft, {
        kind: "check",
        nodeId: checkNode.id,
        optionId: option.id,
        isCorrect: option.isCorrect,
        weaknessId: option.weaknessId
      }).events
    };
  }
  return __toCommonJS(flow_entry_exports);
})();
