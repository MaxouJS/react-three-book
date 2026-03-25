import { getSpreadPairs } from '@objectifthunes/react-three-book';

export interface ResolvedPage {
  effectiveIdx: number;
  isSpread: boolean;
}

export function resolvePageIndex(
  currentPage: number,
  spreadPages: Set<number>,
  pageCount: number,
): ResolvedPage {
  const isRightOfSpread = spreadPages.has(currentPage - 1);
  const effectiveIdx = isRightOfSpread
    ? currentPage - 1
    : Math.min(currentPage, pageCount - 1);
  const isSpread = spreadPages.has(effectiveIdx);
  return { effectiveIdx, isSpread };
}

interface PageNavigationProps {
  pageCount: number;
  spreadPages: Set<number>;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSpreadPagesChange: (next: Set<number>) => void;
}

export default function PageNavigation({
  pageCount,
  spreadPages,
  currentPage,
  onPageChange,
  onSpreadPagesChange,
}: PageNavigationProps) {
  const { effectiveIdx, isSpread } = resolvePageIndex(
    currentPage,
    spreadPages,
    pageCount,
  );
  const eligibleSpreads = new Set(getSpreadPairs(pageCount));

  return (
    <>
      <div className="demo-section-title">Page</div>
      {eligibleSpreads.has(effectiveIdx) && (
        <label className="demo-spread-toggle">
          <input
            type="checkbox"
            checked={isSpread}
            className="demo-spread-checkbox"
            onChange={(e) => {
              const next = new Set(spreadPages);
              if (e.target.checked) next.add(effectiveIdx);
              else next.delete(effectiveIdx);
              onSpreadPagesChange(next);
            }}
          />
          Double-page spread: Pages {effectiveIdx + 1}&ndash;{effectiveIdx + 2}
        </label>
      )}
      <div className="demo-page-nav">
        <button
          type="button"
          className="demo-btn"
          disabled={effectiveIdx <= 0}
          onClick={() => onPageChange(effectiveIdx - 1)}
        >
          &larr;
        </button>
        <input
          type="number"
          min={1}
          max={pageCount}
          value={effectiveIdx + 1}
          className="demo-input--page"
          onChange={(e) =>
            onPageChange(
              Math.max(1, Math.min(pageCount, parseInt(e.target.value, 10) || 1)) - 1,
            )
          }
        />
        <span className="demo-page-count">
          / {pageCount}
        </span>
        {isSpread && (
          <span className="demo-spread-label">
            (Spread {effectiveIdx + 1}&ndash;{effectiveIdx + 2})
          </span>
        )}
        <button
          type="button"
          className="demo-btn"
          disabled={effectiveIdx >= pageCount - 1}
          onClick={() => onPageChange(effectiveIdx + 1)}
        >
          &rarr;
        </button>
      </div>
    </>
  );
}
