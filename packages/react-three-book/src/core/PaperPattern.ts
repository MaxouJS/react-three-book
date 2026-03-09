import * as THREE from 'three';
import { PaperSeam } from './PaperStructs';
import { PaperBorder } from './PaperStructs';

/**
 * Ported from Book.cs — PaperPattern class (lines ~2265-2290).
 *
 * Holds the tessellation layout of a single paper sheet: vertex arrays,
 * seam information, triangle indices, UV coordinates and border definitions.
 */
export class PaperPattern {
  public baseXArray: number[] = [];
  public baseZArray: number[] = [];
  public baseXOffset: number = 0;
  public baseVertexCount: number = 0;

  public xSeams: PaperSeam[] = [];
  public zSeams: PaperSeam[] = [];
  public xNoneSeamIndexes: number[] = [];

  public borders: PaperBorder[] = [];

  public texcoords: THREE.Vector2[] = [];
  public weights: number[] = [];
  public triangles: number[] = [];
  public frontTriangles: number[] = [];
  public backTriangles: number[] = [];
  public borderTriangles: number[] = [];
  public vertexCount: number = 0;
  public subMeshCount: number = 0;

  public size: THREE.Vector2 = new THREE.Vector2();
  public thickness: number = 0;
}
