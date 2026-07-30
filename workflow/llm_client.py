import os
import json
import urllib.request
import urllib.error
import sys

# Try to get API key from environment or .env file (simple parse)
api_key = os.environ.get("OPENAI_API_KEY", "")
if not api_key and os.path.exists("../.env"):
    with open("../.env") as f:
        for line in f:
            if line.startswith("OPENAI_API_KEY="):
                api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
                
def call_openai(system_prompt, user_prompt, max_tokens=1500, temperature=0.7):
    if not api_key:
        return None  # Fallback to mock
        
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    
    data = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": max_tokens,
        "temperature": temperature
    }
    
    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"LLM API Error: {e}", file=sys.stderr)
        return None

def decompose_components(input_json):
    system_prompt = "You are a Software Architect. Given a project description, break it down into logical microservices, modules, or layers. Return ONLY a valid JSON array of objects with 'id', 'name', 'description', and 'features' (list of strings). Maximum 8 components."
    user_prompt = f"Project Details:\n{json.dumps(input_json, indent=2)}"
    
    result = call_openai(system_prompt, user_prompt, temperature=0.2)
    if result:
        # Try to parse the JSON output
        try:
            # Strip markdown code blocks if present
            if result.startswith("```json"):
                result = result.split("```json")[1].split("```")[0].strip()
            elif result.startswith("```"):
                result = result.split("```")[1].split("```")[0].strip()
            return json.loads(result)
        except:
            pass
            
    # Mock fallback
    return [
        {"id": "api-gateway", "name": "API Gateway", "description": "Main entry point", "features": ["Routing"]},
        {"id": "auth-service", "name": "Auth Service", "description": "Handles users", "features": ["Login", "JWT"]}
    ]

def generate_stage(stage_num, context, component_name, template_content="", feedback=""):
    system_prompt = f"You are an Expert Tech Writer and Architect. You are writing Stage {stage_num} documentation for the '{component_name}' component. Output valid Markdown. DO NOT wrap in ```markdown blocks, just output the raw markdown."
    
    user_prompt = f"Context from previous stages:\n{context}\n\n"
    if template_content:
        user_prompt += f"Please use the following template as a structural guide. Fill it in and enhance it based on the context:\n\n{template_content}\n\n"
        
    if feedback:
        user_prompt += f"CRITICAL FEEDBACK FROM PREVIOUS DRAFT (MUST FIX):\n{feedback}\n\n"
        
    user_prompt += f"Please generate the Stage {stage_num} document."
    
    result = call_openai(system_prompt, user_prompt, max_tokens=2500)
    if result:
        return result
        
    # Mock fallback
    return f"# Stage {stage_num} for {component_name}\n\nThis is a mock generated output because no OPENAI_API_KEY was found.\n\n### Context Included\nContext length provided: {len(context)} characters."

def evaluate_document(stage_num, content):
    system_prompt = "You are a Hyper-Critical QA Auditor enforcing rigorous loop engineering. Review the provided documentation draft. You MUST find flaws to force iterative refinement unless the draft is absolutely perfect. Provide a JSON response with exactly three fields: 'score' (a float between 1.0 and 10.0), 'feedback' (a detailed string specifying EXACTLY what must be fixed to reach a 9.0+), and 'approved' (boolean, true ONLY if score >= 9.0 and there are absolutely zero architectural or detail flaws). Only output JSON."
    user_prompt = f"Review this Stage {stage_num} draft:\n\n{content}"
    
    result = call_openai(system_prompt, user_prompt, temperature=0.1)
    if result:
        try:
            if result.startswith("```json"):
                result = result.split("```json")[1].split("```")[0].strip()
            elif result.startswith("```"):
                result = result.split("```")[1].split("```")[0].strip()
            data = json.loads(result)
            score = data.get("score", 8.5)
            approved = data.get("approved", score >= 9.0)
            return score, data.get("feedback", "Looks okay."), approved
        except:
            pass
            
    # Mock fallback
    import random
    score = round(random.uniform(8.0, 9.9), 1)
    approved = score >= 9.0
    feedback = "Mock review: LGTM!" if approved else "Mock review: Needs more detail and rigorous refinement to meet the 9.0 threshold."
    return score, feedback, approved

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", required=True, choices=["decompose", "generate", "evaluate"])
    parser.add_argument("--input", help="Input JSON file for decompose")
    parser.add_argument("--stage", help="Stage number")
    parser.add_argument("--context-file", help="File containing previous stage context")
    parser.add_argument("--template-file", help="File containing the template to follow")
    parser.add_argument("--component", help="Component name")
    parser.add_argument("--content-file", help="File containing draft to evaluate")
    parser.add_argument("--feedback", help="Feedback from previous run")
    
    args = parser.parse_args()
    
    if args.action == "decompose":
        with open(args.input) as f:
            data = json.load(f)
        comps = decompose_components(data)
        print(json.dumps(comps))
        
    elif args.action == "generate":
        context = ""
        if args.context_file and os.path.exists(args.context_file):
            with open(args.context_file) as f:
                context = f.read()
        
        template_content = ""
        if args.template_file and os.path.exists(args.template_file):
            with open(args.template_file) as f:
                template_content = f.read()
                
        out = generate_stage(args.stage, context, args.component or "Main System", template_content, args.feedback or "")
        print(out)
        
    elif args.action == "evaluate":
        content = ""
        if args.content_file and os.path.exists(args.content_file):
            with open(args.content_file) as f:
                content = f.read()
        score, feedback, approved = evaluate_document(args.stage, content)
        print(json.dumps({"score": score, "feedback": feedback, "approved": approved}))
