import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import * as content from "./content.js";

// كل رابط داخلي في content.js يجب أن يكون مسارًا موجودًا في App.jsx أو قسمًا في الصفحة
const PUBLIC_ROUTES = ["/", "/login", "/register"];
const SECTION_ANCHORS = ["top", "problem", "workflow", "students", "organizations", "how", "capabilities", "outcomes", "proof", "start", "faq"];

function collectLinks(value, found = []) {
  if (Array.isArray(value)) value.forEach((item) => collectLinks(item, found));
  else if (value && typeof value === "object") {
    if (typeof value.to === "string") found.push({ to: value.to });
    if (typeof value.href === "string") found.push({ href: value.href });
    Object.values(value).forEach((item) => collectLinks(item, found));
  }
  return found;
}

describe("landing page content", () => {
  it("links only to real public routes and existing sections", async () => {
    const app = await readFile(new URL("../App.jsx", import.meta.url), "utf8");
    for (const link of collectLinks(content)) {
      if (link.to) {
        const path = link.to.split("?")[0];
        assert.ok(PUBLIC_ROUTES.includes(path), `unknown route ${link.to}`);
        assert.match(app, new RegExp(`path="${path}"`), `route ${path} is not declared in App.jsx`);
      } else {
        assert.ok(SECTION_ANCHORS.includes(link.href.slice(1)), `unknown anchor ${link.href}`);
      }
    }
    // يدعم نموذج التسجيل هذا المعامل لاختيار حساب المؤسسة
    assert.equal(content.ROUTES.registerOrganization, "/register?role=organization");
  });

  it("keeps the section switches unique and the unverified proof section off and empty", () => {
    const ids = content.SECTIONS.map((section) => section.id);
    assert.equal(new Set(ids).size, ids.length);
    const proof = content.SECTIONS.find((section) => section.id === "proof");
    assert.equal(proof.enabled, false);
    assert.deepEqual([content.proof.stats, content.proof.testimonials], [[], []]);
  });

  it("does not promise jobs, income or results, and labels illustrations as such", () => {
    const text = JSON.stringify(content);
    assert.match(content.outcomes.disclaimer, /لا تضمن/);
    assert.match(content.problem.student.meter.note, /توضيحي/);
    // الرسم بالنقاط فقط: لا نص رقمي يمكن أن يُقرأ كإحصاء
    assert.ok(content.problem.student.meter.rows.every((row) => !/\d/.test(row.label)));
    assert.doesNotMatch(content.workflow.title, /ناجح/);
    assert.doesNotMatch(text, /نضمن|مضمون|الأفضل|الأولى في|آلاف|ملايين|\d+\s*%|\d+\+/);
    // مدة إعادة التقييم تختلف بين main وفرع الإصلاح غير المنشور؛ لا تُذكر في النص المعروض قبل التحقق من الإنتاج
    assert.doesNotMatch(text, /سبعة أيام|7 أيام|24 ساعة|أسبوع/);
  });
});
