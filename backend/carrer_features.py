from groq_service import (
    generate_learning_path_llm,
    suggest_roles_llm,
    estimate_salary_llm,
    generate_career_synthesis
)


# 🚀 OPTIMIZATION: BATCH FEATURE SYNTHESIS (1 CALL INSTEAD OF 3)
def get_career_synthesis(best_role, priority_skills, resume_skills, target_role):
    try:
        data = generate_career_synthesis(best_role, priority_skills, resume_skills, target_role)
        if data and isinstance(data, dict) and data.get("learning_path"):
            return {
                "learning_path": data.get("learning_path", []),
                "better_fit_roles": data.get("better_fit_roles", []),
                "estimated_salary": data.get("estimated_salary", "₹8L – ₹20L")
            }
    except Exception:
        pass

    # Fallback to individual calls if batch fails
    return {
        "learning_path": generate_learning_path(priority_skills, best_role),
        "better_fit_roles": suggest_roles(resume_skills, target_role),
        "estimated_salary": estimate_salary(best_role)
    }



# 🔥 PRIORITY (RULE BASED)
def get_learning_priority(missing_skills, classified_skills):
    core = set(s.lower() for s in classified_skills.get("core", []))
    important = set(s.lower() for s in classified_skills.get("important", []))

    priority = []

    for skill in missing_skills:
        if skill.lower() in core:
            weight = 3
        elif skill.lower() in important:
            weight = 2
        else:
            weight = 1

        priority.append((skill, weight))

    priority.sort(key=lambda x: x[1], reverse=True)

    return [s for s, _ in priority]


# 🔥 ROADMAP (CALL LLM SERVICE)
def generate_learning_path(priority_skills, role):
    try:
        return generate_learning_path_llm(priority_skills, role)
    except:
        return []


# 🔥 ROLE SWITCH (CALL LLM SERVICE)
def suggest_roles(resume_skills, target_role):
    try:
        return suggest_roles_llm(resume_skills, target_role)
    except:
        return []


# 🔥 SALARY (CALL LLM SERVICE)
def estimate_salary(role):
    try:
        return estimate_salary_llm(role)
    except:
        return "₹3L – ₹10L"


# 🔥 SKILL GAP (KEEP RULE-BASED)
def compute_skill_gap(classified_skills, missing_skills):
    core = set(s.lower() for s in classified_skills.get("core", []))
    important = set(s.lower() for s in classified_skills.get("important", []))
    optional = set(s.lower() for s in classified_skills.get("optional", []))

    return {
        "core_gap": sum(1 for s in missing_skills if s.lower() in core) * 10,
        "important_gap": sum(1 for s in missing_skills if s.lower() in important) * 8,
        "optional_gap": sum(1 for s in missing_skills if s.lower() in optional) * 5,
    }