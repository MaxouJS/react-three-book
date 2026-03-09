/**
 * Ported from BookContent.cs — BookContent class and BookDirection enum.
 *
 * Unity MonoBehaviour → plain class.
 * Unity Object references → THREE.Texture or IPageContent instances.
 */

import * as THREE from 'three';
import type { Book } from './Book';
import { BookDirection } from './BookDirection';
import type { IPageContent } from './PageContent';
import { SpritePageContent2 } from './PageContent';

// ─────────────────────────────────────────────────────────────────────────────
// BookContent (BookContent.cs lines 8-322)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Content for the book: covers and pages.
 *
 * In Unity, list items can be Sprite, SpritePageContent, or LivePageContent.
 * In Three.js, list items are either THREE.Texture or IPageContent instances.
 */
export class BookContent {
  private m_Direction: BookDirection = BookDirection.LeftToRight;
  private m_Covers: (THREE.Texture | IPageContent | null)[] = [null, null, null, null];
  private m_Pages: (THREE.Texture | IPageContent | null)[] = [null, null, null, null, null, null, null, null];
  private m_Book: Book | null = null;

  private get coverCount4(): number {
    return this.nextMultipleOf4(this.m_Covers.length);
  }

  private get pageCount4(): number {
    return this.nextMultipleOf4(this.m_Pages.length);
  }

  get book(): Book | null {
    return this.m_Book;
  }

  get covers(): (THREE.Texture | IPageContent | null)[] {
    return this.m_Covers;
  }

  get pages(): (THREE.Texture | IPageContent | null)[] {
    return this.m_Pages;
  }

  get isEmpty(): boolean {
    return this.m_Covers.length === 0 && this.m_Pages.length === 0;
  }

  get direction(): BookDirection {
    return this.m_Direction;
  }

  set direction(value: BookDirection) {
    this.m_Direction = value;
  }

  get coverContents(): IPageContent[] {
    return this.getContents(this.m_Covers, false);
  }

  get pageContents(): IPageContent[] {
    return this.getContents(this.m_Pages, false);
  }

  private getContents(
    contents: (THREE.Texture | IPageContent | null)[],
    isCover: boolean,
  ): IPageContent[] {
    const n = contents.length;
    let n2 = this.nextMultipleOf4(n);
    if (isCover) n2 = Math.min(n2, 4);
    const interfaces: IPageContent[] = new Array(n2);
    for (let i = 0; i < n2; i++) {
      interfaces[i] = this.getContent(i < n ? contents[i] : null);
    }
    return interfaces;
  }

  private nextMultipleOf4(n: number): number {
    return Math.ceil(n / 4) * 4;
  }

  private getContent(content: THREE.Texture | IPageContent | null): IPageContent {
    if (content !== null) {
      // If it's a THREE.Texture, wrap in SpritePageContent2
      if (content instanceof THREE.Texture) {
        return new SpritePageContent2(content);
      }
      // If it already implements IPageContent
      if (typeof (content as IPageContent).init === 'function') {
        return content as IPageContent;
      }
    }
    return new SpritePageContent2(null);
  }

  init(book: Book): void {
    this.m_Book = book;

    for (const cover of this.coverContents) {
      cover.init(this);
    }
    for (const page of this.pageContents) {
      page.init(this);
    }
  }

  // ── Index conversion methods ───────────────────────────────────────────

  convertCoverIndexToPaperSideIndex(coverIndex: number): number {
    if (this.m_Covers.length === 0)
      throw new Error('Check covers.length > 0 before calling this method.');
    if (this.m_Pages.length === 0) return coverIndex;
    return coverIndex < this.coverCount4 / 2
      ? coverIndex
      : coverIndex + this.pageCount4;
  }

  convertPageIndexToPaperSideIndex(pageIndex: number): number {
    if (this.m_Pages.length === 0)
      throw new Error('Check pages.length > 0 before calling this method.');
    if (this.m_Covers.length === 0) return pageIndex;
    return pageIndex + this.coverCount4 / 2;
  }

  convertPaperSideIndexToCoverIndex(paperSideIndex: number): number {
    if (this.m_Covers.length === 0)
      throw new Error('Check covers.length > 0 before calling this method.');
    if (this.isPagePaperSideIndex(paperSideIndex))
      throw new Error('Check isCoverPaperSideIndex before calling this method.');
    return paperSideIndex > this.coverCount4 / 2
      ? paperSideIndex - this.pageCount4
      : paperSideIndex;
  }

  convertPaperSideIndexToPageIndex(paperSideIndex: number): number {
    if (this.m_Pages.length === 0)
      throw new Error('Check pages.length > 0 before calling this method.');
    if (this.isCoverPaperSideIndex(paperSideIndex))
      throw new Error('Check isPagePaperSideIndex before calling this method.');
    return paperSideIndex - this.coverCount4 / 2;
  }

  convertPaperSideIndexToOpenProgress(paperSideIndex: number): number {
    return paperSideIndex / (this.coverCount4 + this.pageCount4 - 1);
  }

  isCoverPaperSideIndex(paperSideIndex: number): boolean {
    const coverPaperCount = this.coverCount4 / 2;
    const pagePaperCount = this.pageCount4 / 2;

    if (coverPaperCount === 0) return false;
    if (pagePaperCount === 0) return true;

    const firstPageSideIndex = coverPaperCount;
    const lastPageSideIndex = coverPaperCount + pagePaperCount * 2 - 1;

    return paperSideIndex < firstPageSideIndex || paperSideIndex > lastPageSideIndex;
  }

  isPagePaperSideIndex(paperSideIndex: number): boolean {
    return !this.isCoverPaperSideIndex(paperSideIndex);
  }
}
