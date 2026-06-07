from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api import compare, demos, domains, experiments, methods, nodes, pipeline, run as run_api
from core.utils import ensure_runtime_dirs, get_comparisons_dir, get_pipelines_dir, get_project_root, load_config

app = FastAPI(title="GoodLearn API", version="0.1.0")

cfg = load_config()
frontend_origin = f"http://{cfg['frontend']['host']}:{cfg['frontend']['port']}"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_runtime_dirs()

runtime_outputs = Path(cfg["runtime"]["outputs"])
runtime_outputs.mkdir(parents=True, exist_ok=True)
app.mount("/runtime/outputs", StaticFiles(directory=str(runtime_outputs)), name="runtime_outputs")

runtime_pipelines = get_pipelines_dir()
runtime_pipelines.mkdir(parents=True, exist_ok=True)
app.mount("/runtime/pipelines", StaticFiles(directory=str(runtime_pipelines)), name="runtime_pipelines")

runtime_comparisons = get_comparisons_dir()
runtime_comparisons.mkdir(parents=True, exist_ok=True)
app.mount("/runtime/comparisons", StaticFiles(directory=str(runtime_comparisons)), name="runtime_comparisons")

app.include_router(experiments.router)
app.include_router(compare.router)
app.include_router(demos.router)
app.include_router(domains.router)
app.include_router(nodes.router)
app.include_router(methods.router)
app.include_router(pipeline.router)
app.include_router(run_api.router)


@app.get("/api/health")
def health():
    from core.model_registry import check_external_models

    return {
        "status": "ok",
        "project_root": str(get_project_root()),
        "external_models": check_external_models(),
    }
