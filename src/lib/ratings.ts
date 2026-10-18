import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

// Community ratings from people who cooked a recipe in Mise (no invented numbers).
export type RecipeRating = { avg: number; count: number };
type Ratings = Record<number, RecipeRating>;

const STORAGE_KEY = "mise_ratings_v1";

function readCached(): Ratings {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Ratings;
  } catch {
    return {};
  }
}

// The latest ratings, readable from plain functions (sorting, recommendations, meal
// planning) without threading them through every call. `useCommunityRatings` keeps
// it current; the App re-renders whenever it changes.
let current: Ratings = readCached();

export function ratingOf(recipeId: number): RecipeRating | null {
  const r = current[recipeId];
  return r && r.count > 0 ? r : null;
}

// For ranking: an average pulled toward 4★ until a recipe has a few ratings, so one
// early 5★ doesn't outrank something many people liked.
const PRIOR = 4;
const PRIOR_WEIGHT = 3;
export function rankingRating(recipeId: number): number {
  const r = ratingOf(recipeId);
  return r ? (r.avg * r.count + PRIOR * PRIOR_WEIGHT) / (r.count + PRIOR_WEIGHT) : PRIOR;
}

export function ratingCount(recipeId: number): number {
  return ratingOf(recipeId)?.count ?? 0;
}

export function useCommunityRatings(): { ratings: Ratings; update: (recipeId: number, r: RecipeRating) => void } {
  const [ratings, setRatings] = useState<Ratings>(current);
  current = ratings;

  useEffect(() => {
    api<{ ratings: Ratings }>("/ratings")
      .then(({ ratings: fresh }) => {
        setRatings(fresh);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        } catch {
          // storage full or blocked — ratings still work for this session
        }
      })
      .catch(() => {
        // offline or server down — keep the cached ratings
      });
  }, []);

  const update = useCallback((recipeId: number, r: RecipeRating) => setRatings((prev) => ({ ...prev, [recipeId]: r })), []);
  return { ratings, update };
}
