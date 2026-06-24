export interface EngineEval {
  cp: number | null;
  mate: number | null;
}

export type MoveQuality = "blunder" | "mistake" | "inaccuracy" | "good";

export interface Engine {
  evaluateFen(fen: string, depth: number): Promise<EngineEval>;
  terminate(): void;
}

const MATE_SCORE_CP = 10000;

function toMoverPerspectiveCp(evalScore: EngineEval, color: "w" | "b"): number {
  const cp = evalScore.mate !== null ? (evalScore.mate > 0 ? MATE_SCORE_CP : -MATE_SCORE_CP) : evalScore.cp ?? 0;
  return color === "w" ? cp : -cp;
}

export function classifyMove(before: EngineEval, after: EngineEval, color: "w" | "b"): MoveQuality {
  const drop = toMoverPerspectiveCp(before, color) - toMoverPerspectiveCp(after, color);
  if (drop > 200) return "blunder";
  if (drop > 100) return "mistake";
  if (drop > 50) return "inaccuracy";
  return "good";
}

const ENGINE_PATH = "/stockfish/stockfish-18-lite-single.js";

export function createStockfishEngine(): Engine {
  const worker = new Worker(ENGINE_PATH);

  const ready = new Promise<void>((resolve) => {
    function onReady(e: MessageEvent<string>) {
      if (e.data === "readyok") {
        worker.removeEventListener("message", onReady);
        resolve();
      }
    }
    worker.addEventListener("message", onReady);
    worker.postMessage("uci");
    worker.postMessage("isready");
  });

  return {
    async evaluateFen(fen: string, depth: number): Promise<EngineEval> {
      await ready;
      return new Promise((resolve) => {
        let lastEval: EngineEval = { cp: null, mate: null };

        function onMessage(e: MessageEvent<string>) {
          const line = e.data;
          const cpMatch = line.match(/score cp (-?\d+)/);
          const mateMatch = line.match(/score mate (-?\d+)/);
          if (cpMatch) lastEval = { cp: Number(cpMatch[1]), mate: null };
          if (mateMatch) lastEval = { cp: null, mate: Number(mateMatch[1]) };
          if (line.startsWith("bestmove")) {
            worker.removeEventListener("message", onMessage);
            resolve(lastEval);
          }
        }

        worker.addEventListener("message", onMessage);
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
      });
    },
    terminate() {
      worker.terminate();
    },
  };
}
