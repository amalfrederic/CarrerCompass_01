import math
import re
from sentence_transformers import util

# 🔹 Skill weights
SKILL_TIERS = {
    "core": 1.0,
    "important": 0.6,
    "optional": 0.3
}

def skill_weight(tier: str) -> float:
    return SKILL_TIERS.get(tier, 0.3)


# 🔹 Seniority
def seniority_multiplier(resume_text: str) -> float:
    patterns = [r'(\d+)\+?\s*years?', r'(\d+)\s*yrs?']
    years = 0

    for p in patterns:
        match = re.search(p, resume_text, re.IGNORECASE)
        if match:
            years = int(match.group(1))
            break

    if years == 0: return 0.85
    if years <= 2: return 0.95
    if years <= 5: return 1.0
    if years <= 8: return 1.05
    return 1.08


# 🔹 Core match scoring (FAST VERSION)
def core_match_score(resume_skills, job_skills, model):
    total_weight = 0.0
    earned_weight = 0.0

    matched = []
    missing = []

    job_list = list(job_skills.keys())

    # 🛡️ Guard against empty skill lists (prevents PyTorch mat1/mat2 shape crash)
    if not job_list:
        return 0, [], []

    if not resume_skills:
        return 0, [], job_list

    # Precompute embeddings
    resume_emb = model.encode(resume_skills, convert_to_tensor=True)
    job_emb = model.encode(job_list, convert_to_tensor=True)

    sim_matrix = util.cos_sim(resume_emb, job_emb)

    for j_idx, job_skill in enumerate(job_list):
        tier = job_skills[job_skill]
        w = skill_weight(tier)

        total_weight += w

        best_score = max(sim_matrix[:, j_idx]).item()

        if best_score >= 0.65:
            earned_weight += w * best_score
            matched.append(job_skill)
        else:
            missing.append(job_skill)

    score = earned_weight / total_weight if total_weight else 0

    return score, matched, missing


# 🔹 Final scoring
def final_score(resume_text, resume_skills, job_skills, model):

    core, matched, missing = core_match_score(
        resume_skills, job_skills, model
    )

    seniority = seniority_multiplier(resume_text)

    raw_score = core  # simplified (no breadth for now)

    final = round(min(raw_score * seniority * 100, 100), 2)

    label = (
        "Excellent Match" if final >= 75 else
        "Good Match" if final >= 55 else
        "Partial Match" if final >= 35 else
        "Weak Match"
    )

    return {
        "score": final,
        "label": label,
        "core_score": round(core * 100, 2),
        "matched_skills": matched,
        "missing_skills": missing
    }