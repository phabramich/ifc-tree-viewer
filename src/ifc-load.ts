import type { IfcProperty, IfcSite } from "web-ifc";
import { IfcClass } from "./ifc-classes";
import { ifcService, type WebIfcLine } from "./ifc-service";
import type { TreeNode } from "carbon-components-svelte/types/TreeView/TreeView.svelte";
import { decodeIFCString } from "./ifc-service";

export type HierarchialView = {
  name: string,
  type: string,
  children?: HierarchialView | HierarchialView[],
}

export type ConstructionObjectData = WebIfcLine & { ifcProperties?: IfcProperty[] }

export default async function loadIfc(file: File): Promise<[TreeNode[], number]> {
  const modelId = await loadIfcFile(file);
  if (modelId === null) {
    return [[], -11];
  }
  const site = ifcService.getExclusiveElement<IfcSite>(modelId, IfcClass.IfcSite, true);
  const constructionObjects = parseModelHierarchy(modelId, site);
  // loadingRoutine(modelId, site);
  return [constructionObjects, modelId];
}

export function loadObjectData(modelId: number, expressId: number): ConstructionObjectData {
  const ifcData: ConstructionObjectData = ifcService.getElementById(modelId, expressId, true);
  ifcData.ifcProperties = ifcService.getProperties(modelId, expressId);
  return ifcData;
}

async function loadIfcFile(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file);
  const res = await fetch(url);
  const modelUintArray = new Uint8Array(await res.arrayBuffer());
  try {
    return await ifcService.loadIfcModelFromUint8Array(modelUintArray);
  } catch {
    console.error("can't load the file")
    return null;
  }
}

function loadingRoutine(
  modelId: number,
  currentElement: WebIfcLine | undefined,
): WebIfcLine | null {
  if (!currentElement) {
    return null;
  }
  const childrenIfcObjects: (WebIfcLine | undefined)[] = ifcService
    .getChildrenIdsByElementId(modelId, currentElement?.expressID)
    .map(id => ifcService.getElementById(modelId, id, true));

  currentElement["ChildrenObjects"] = childrenIfcObjects.map(ch => {
    return loadingRoutine(modelId, ch);
  })

  currentElement["IfcProperties"] = ifcService.getProperties(modelId, currentElement.expressID);
  return currentElement;
}

function parseChildren(
  modelId: number,
  currentElement: WebIfcLine | undefined,
): WebIfcLine | null {
  if (!currentElement) {
    return null;
  }

  const childrenIfcObjects: (WebIfcLine | undefined)[] = ifcService
    .getChildrenIdsByElementId(modelId, currentElement?.expressID)
    .map(id => ifcService.getElementById(modelId, id, false));

  currentElement["children"] = childrenIfcObjects.map(ch => {
    return parseChildren(modelId, ch);
  })
  return currentElement;
}

function parseModelHierarchy(modelId: number, site: WebIfcLine): TreeNode[] {
  const siteWithFilledHierarchy = parseChildren(modelId, site);

  return webIfcLineToHierarchialView(siteWithFilledHierarchy);
}

function webIfcLineToHierarchialView(obj: WebIfcLine | WebIfcLine[] | undefined): TreeNode[] | undefined {
  if (obj === undefined) {
    return undefined
  }
  if (Array.isArray(obj)) {
    const objList = obj.map(el => {
      return { id: el.expressID, text: decodeIFCString(el.Name.value), children: webIfcLineToHierarchialView(el["children"]) }
    })
    return objList.length > 0 ? objList : undefined;
  } else {
      return [{ id: obj.expressID, text: decodeIFCString(obj.Name.value), children: webIfcLineToHierarchialView(obj["children"]) }]
  }
}

type Item = string | null | undefined | WebIfcLine | number | Record<string, string | null | undefined | WebIfcLine | number>

let id = 0

export function objectDataToTreeNodes(objData: Item): TreeNode[] | undefined {
  if (objData === null || objData === undefined) {
    return undefined;
  }
  if (typeof objData === "string") {
    id++
    return [{ id, text: objData }]
  }
  if (typeof objData === "number") {
    id++
    return [{ id, text: objData.toString() }]
  }
  const nodes: TreeNode[] = []
  for (const [param, obj] of Object.entries(objData)) {
    id++
    nodes.push({id, text: param, children: objectDataToTreeNodes(obj) })
  }
  return nodes;
}
