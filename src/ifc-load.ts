import type { IfcSite } from "web-ifc";
import { IfcClass } from "./ifc-classes";
import { ifcService, type WebIfcLine } from "./ifc-service";

export default async function loadIfc(file: File): Promise<Record<string, any>> {
  const modelId = await loadIfcFile(file);
  if (modelId === null) {
    return {};
  }
  const site = ifcService.getExclusiveElement<IfcSite>(modelId, IfcClass.IfcSite, true);
  loadingRoutine(modelId, site);
  return site;
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
  // if (!currentNode) {
  //   return null;
  // }

  const childrenIfcObjects: (WebIfcLine | undefined)[] = ifcService
    .getChildrenIdsByElementId(modelId, currentElement?.expressID)
    .map(id => ifcService.getElementById(modelId, id, true));

  currentElement["ChildrenObjects"] = childrenIfcObjects.map(ch => {
    return loadingRoutine(modelId, ch);
  })

  currentElement["IfcProperties"] = ifcService.getProperties(modelId, currentElement.expressID);
  return currentElement;
}
