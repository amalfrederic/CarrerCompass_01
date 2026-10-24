# career_analyzer.py

from analyser import analyze_resume_against_job, score_role_with_classified_skills
from semantic_engine import extract_semantic_skills
from groq_service import (
    generate_roles_from_domain,
    generate_roles_with_skills
)
from carrer_features import (
    get_learning_priority,
    compute_skill_gap,
    get_career_synthesis
)


def analyze_career(resume_text, target_role):

    # 1️⃣ Extract candidate resume skills ONCE (Call 1)
    resume_skills = extract_semantic_skills(resume_text)

    # 2️⃣ Batch generate roles with classified skills (Call 2)
    roles_data = generate_roles_with_skills(target_role)

    results = []

    if roles_data and isinstance(roles_data, list):
        # 🚀 FAST PATH: All 5 roles scored locally via PyTorch embeddings with 0 extra API calls
        for item in roles_data:
            role_name = item.get("role", "")
            classified = item.get("classified_skills", {})
            if not role_name or not classified:
                continue

            score_res = score_role_with_classified_skills(
                resume_text=resume_text,
                resume_skills=resume_skills,
                classified=classified
            )

            results.append({
                "role": role_name,
                "score": score_res.get("match_percentage", 0),
                "matched_skills": score_res.get("matched_skills", []),
                "missing_skills": score_res.get("missing_skills", []),
                "classified_skills": score_res.get("classified_skills", {})
            })

    # Fallback if batch generation did not return valid roles
    if not results:
        roles = generate_roles_from_domain(target_role)
        if not roles or not isinstance(roles, list):
            return {"error": "Role generation failed", "roles": roles}

        for role in roles:
            result = analyze_resume_against_job(
                resume_text=resume_text,
                job_description=role,
                pre_extracted_skills=resume_skills
            )
            if isinstance(result, dict) and "error" in result:
                continue

            results.append({
                "role": role,
                "score": result.get("match_percentage", 0),
                "matched_skills": result.get("matched_skills", []),
                "missing_skills": result.get("missing_skills", []),
                "classified_skills": result.get("classified_skills", {})
            })

    # 3️⃣ Sort roles by score
    results = sorted(results, key=lambda x: x["score"], reverse=True)

    if not results:
        return {"error": "No valid role analysis"}

    # 4️⃣ Best role
    best_role = results[0]

    # 5️⃣ Local Feature Engine (Instant rule-based metrics)
    learning_priority = get_learning_priority(
        best_role["missing_skills"],
        best_role.get("classified_skills", {})
    )

    skill_gap = compute_skill_gap(
        best_role.get("classified_skills", {}),
        best_role["missing_skills"]
    )

    insights = generate_career_insights(best_role["score"])

    # 6️⃣ Batch Career Synthesis (Call 3: Roadmap + Better Roles + Salary)
    synthesis = get_career_synthesis(
        best_role=best_role["role"],
        priority_skills=learning_priority,
        resume_skills=resume_skills,
        target_role=target_role
    )

    # 7️⃣ FINAL RESPONSE
    return {
        "target_role": target_role,
        "best_fit_role": best_role,
        "all_roles": results,

        # FEATURES
        "learning_priority": learning_priority,
        "learning_path": synthesis.get("learning_path", []),
        "better_fit_roles": synthesis.get("better_fit_roles", []),
        "estimated_salary": synthesis.get("estimated_salary", "₹8L – ₹20L"),
        "skill_gap": skill_gap,

        "career_insights": insights
    }



# 🔥 USER-FOCUSED INSIGHTS
def generate_career_insights(score):

    if score >= 75:
        return "You are job-ready for this role. Start applying confidently."

    elif score >= 55:
        return "You are close to this role. Improve a few key skills to become job-ready."

    elif score >= 35:
        return "You have a foundation, but need to build stronger domain skills."

    else:
        return "You need to develop core skills before targeting this role."