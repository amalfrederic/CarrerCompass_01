from groq import Groq
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# 🔧 Clean JSON safely
def clean_json_response(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r"```json|```", "", text).strip()

    # extract JSON array or object
    match = re.search(r"\[.*\]|\{.*\}", text, re.DOTALL)
    return match.group(0) if match else text


# 🔥 Hybrid LLM Router
def generate_response(prompt, task="general"):
    try:
        # 🔥 Choose model based on task
        if task in ["classification", "evaluation"]:
            model = "openai/gpt-oss-120b"  # 🔥 better reasoning
            temperature = 0.1
        else:
            model = "openai/gpt-oss-20b"   # ⚡ fast & active
            temperature = 0.2

        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature
        )

        return response.choices[0].message.content

    except Exception as e:
        return {"error": str(e)}


# 🔥 1️⃣ Extract Job Skills (FAST MODEL)
def extract_job_skills(job_description: str):
    prompt = f"""
You are an expert recruiter across ALL engineering domains.

Task:
Extract the MOST IMPORTANT technical skills required for this role.

Rules:
- Include programming languages, frameworks, tools, and concepts
- Avoid unnecessary or overly niche skills
- Keep skills short (1–3 words)
- Remove duplicates
- Return ONLY JSON array (no markdown, no explanation)

Example:
["Python", "Machine Learning", "Docker"]

Job Description:
{job_description}
"""

    try:
        raw_text = generate_response(prompt, task="extraction")

        if isinstance(raw_text, dict):
            return raw_text

        cleaned = clean_json_response(raw_text)
        skills = json.loads(cleaned)

        return skills if isinstance(skills, list) else {"error": "Invalid format", "raw": raw_text}

    except Exception as e:
        return {"error": str(e)}


# 🔥 2️⃣ Classify Skills (GPT-OSS 🔥)
def classify_job_skills(extracted_jobs, role):
    prompt = f"""
You are a senior hiring manager.

Task:
Classify skills realistically for hiring.

Guidelines:
- Core → ONLY 2–3 absolutely mandatory skills
- Important → frameworks, libraries, tools
- Optional → supporting or additional

IMPORTANT:
- Do NOT include libraries like NumPy, Pandas as core
- Do NOT include frameworks like TensorFlow/PyTorch as core
- Keep core VERY SMALL (max 3)
- Be practical like a real recruiter

Return ONLY JSON.

Format:
{{
  "core": [],
  "important": [],
  "optional": []
}}

Skills:
{extracted_jobs}

Role:
{role}
"""

    try:
        raw_text = generate_response(prompt, task="classification")

        if isinstance(raw_text, dict):
            return raw_text

        cleaned = clean_json_response(raw_text)
        data = json.loads(cleaned)

        if not all(k in data for k in ["core", "important", "optional"]):
            return {"error": "Invalid structure", "raw": raw_text}

        return data

    except Exception as e:
        return {"error": str(e)}


# 🔥 3️⃣ Evaluate Resume Skills (GPT-OSS 🔥)
def evaluate_resume_skills(resume_skills, job_role):
    prompt = f"""
You are an expert recruiter.

Task:
From the given resume skills, identify which skills are relevant OR useful for the job role.

IMPORTANT:
- Include both direct and supporting skills
- Include cloud (AWS), DevOps (Docker, Kubernetes), backend tools
- Do NOT be overly strict
- Return ONLY JSON ARRAY (not object)

Example:
["Python", "Docker", "AWS"]

Resume Skills:
{resume_skills}

Job Role:
{job_role}
"""

    try:
        raw_text = generate_response(prompt, task="evaluation")

        if isinstance(raw_text, dict):
            return raw_text

        cleaned = clean_json_response(raw_text)
        data = json.loads(cleaned)

        return data if isinstance(data, list) else {"error": "Invalid format", "raw": raw_text}

    except Exception as e:
        return {"error": str(e)}
    

def generate_skill_hierarchy(skills):
    prompt = f"""
You are an expert in skill relationships.

Task:
Identify hierarchy ONLY within given skills.

Rules:
- DO NOT add new skills
- Only use given skills
- Child → parent relationship
- If no relation → empty list

Return ONLY JSON.

Format:
{{
  "skill": ["parent"]
}}

Skills:
{skills}
"""

    raw = generate_response(prompt)

    try:
        cleaned = clean_json_response(raw)
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else {}
    except:
        return {}
    

def generate_roles_from_domain(domain):
    prompt = f"""
You are an expert in tech careers.

Given a general role, generate 5–7 specific job roles.

Rules:
- Be realistic industry roles
- Keep concise
- Return ONLY JSON array

Example:
Input: AI Engineer
Output:
["Machine Learning Engineer", "Deep Learning Engineer", "NLP Engineer"]

Domain:
{domain}
"""

    raw = generate_response(prompt)
    cleaned = clean_json_response(raw)
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, list) else []
    except Exception:
        return []

def extract_resume_skills_llm(resume_text):
    prompt = f"""
You are an expert recruiter across ALL engineering domains.

Extract ALL technical skills from this resume.

Rules:
- Include programming languages, frameworks, tools, concepts
- Do NOT include soft skills
- Keep skills concise (1–3 words)
- Remove duplicates
- Return ONLY JSON array

Example:
["Python", "PyTorch", "Docker", "Machine Learning"]

Resume:
{resume_text}
"""

    raw = generate_response(prompt)
    cleaned = clean_json_response(raw)
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, list) else []
    except Exception:
        return []

# 🔥 LEARNING ROADMAP
def generate_learning_path_llm(priority_skills, role):
    prompt = f"""
You are an expert career mentor.

Create a step-by-step roadmap for: {role}

Skills:
{priority_skills}

Rules:
- Max 6 steps
- Practical steps
- Include projects
- Return ONLY JSON list
"""

    raw = generate_response(prompt)
    cleaned = clean_json_response(raw)
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, list) else []
    except Exception:
        return []

# 🔥 ROLE SUGGESTION
def suggest_roles_llm(resume_skills, target_role):
    prompt = f"""
You are a career advisor.

Suggest best roles based on skills.

Skills:
{resume_skills}

Target:
{target_role}

Rules:
- 3–5 roles
- Realistic
- Return JSON list
"""

    raw = generate_response(prompt)
    cleaned = clean_json_response(raw)
    try:
        data = json.loads(cleaned)
        return data if isinstance(data, list) else []
    except Exception:
        return []

# 🔥 SALARY ESTIMATION
def estimate_salary_llm(role):
    prompt = f"""
Estimate salary range for role: {role}

Rules:
- India salary
- Return ONLY string

Example:
"₹8L – ₹20L"
"""

    raw = generate_response(prompt)
    return raw.strip().replace('"', '')