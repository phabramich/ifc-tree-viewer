import { IfcClass } from "./ifc-classes";
import {
  Handle,
  IfcAPI,
  type FlatMesh,
  type PlacedGeometry,
  type Vector,
  IfcLabel,
  IfcRelAggregates,
  IfcObjectDefinition,
  IfcProperty,
  IfcRelDefinesByProperties,
  IfcRelDefinesByType,
  IfcSpaceType,
  IfcPropertySet,
  IfcElementQuantity,
  IfcRelContainedInSpatialStructure,
  IfcSpatialElement,
} from "web-ifc";

export type WebIfcLine = {
  GlobalId: {
    value: string;
  };
  Name: IfcLabel | null;
  expressID: number;
  type: number;
};


/**
 * Adapted web-ifc methods
 */
class IfcService {
  isWebIfcInitialized = false;

  ifcApi: IfcAPI | null = null;

  async initializeWebIfc(): Promise<void> {
    try {
      this.ifcApi = new IfcAPI();
      this.ifcApi.SetWasmPath("./assets/");
      await this.ifcApi.Init();
      this.isWebIfcInitialized = true;
    } catch {
      console.log("Could not initialize WebIfc");
    }
  }

  async loadIfcModelFromUint8Array(buffer: Uint8Array): Promise<number | undefined> {
    if (!this.isWebIfcInitialized) {
      await this.initializeWebIfc();
    }
    const modelId: number | undefined = this.ifcApi?.OpenModel(buffer);
    if (modelId === undefined) {
      return;
    }
    console.log(`IFC model has been loaded with id ${modelId}`);
    return modelId;
  }

  /**
   * Used for loading element that is the only one in model (e.g. IfcSite)
   */
  getExclusiveElement<T>(modelId: number, ifcClass: IfcClass, flatten?: boolean): T {
    const [elemId]: number[] = this.getIfcIdsByClass(modelId, ifcClass);
    return this.getTypedElementById<T>(modelId, elemId, flatten);
  }

  getElementsOfClass<T>(modelId: number, ifcClass: IfcClass): T[] {
    const elemIds: number[] = this.getIfcIdsByClass(modelId, ifcClass);
    return elemIds.map(id => this.getTypedElementById<T>(modelId, id));
  }

  getElementGeometry(modelId: number, elementId: number): PlacedGeometry[] {
    const flatMeshVector: FlatMesh = this.ifcApi?.GetFlatMesh(modelId, elementId) as FlatMesh;

    return this.vectorToList(flatMeshVector.geometries);
  }

  getElementById(modelId: number, elementId: number, flatten = false): WebIfcLine | undefined {
    if (!this.ifcApi) {
      return;
    }
    return this.ifcApi.GetLine(modelId, elementId, flatten) as WebIfcLine;
  }

  getTypedElementById<T>(modelId: number, elementId: number, flatten = false): T {
    return this.getElementById(modelId, elementId, flatten) as T;
  }

  getProperties(modelId: number, elementid: number): IfcProperty[] {
    const propSetIds: number[] = [];
    // Getting all IfcRelDefinesByProperties and filter out those not related to our target
    const byProperties: IfcRelDefinesByProperties[] = this.getElementsOfClass<IfcRelDefinesByProperties>(
      modelId,
      IfcClass.IfcRelDefinesByProperties,
    );
    const byType: IfcRelDefinesByType[] = this.getElementsOfClass<IfcRelDefinesByType>(
      modelId,
      IfcClass.IfcRelDefinesByType,
    );

    // Add related prop set ids to out ids' list
    byProperties.forEach(ifcRelAggr =>
      ifcRelAggr.RelatedObjects.forEach(obj => {
        if ("value" in obj && obj.value === elementid) {
          if ("value" in ifcRelAggr.RelatingPropertyDefinition) {
            propSetIds.push(ifcRelAggr.RelatingPropertyDefinition.value);
          }
        }
      }),
    );
    byType.forEach(ifcRelDef =>
      ifcRelDef.RelatedObjects.forEach(obj => {
        if ("value" in obj && obj.value === elementid) {
          if ("value" in ifcRelDef.RelatingType) {
            const relAggrId = ifcRelDef.RelatingType.value;
            const space = this.getTypedElementById<IfcSpaceType>(modelId, relAggrId);
            space.HasPropertySets?.forEach(set => {
              if ("value" in set) {
                propSetIds.push(set.value);
              }
            });
          }
        }
      }),
    );

    const props: IfcProperty[] = [];
    // eslint-disable-next-line array-callback-return
    propSetIds.flatMap(propSetId => {
      const propSet: WebIfcLine | undefined = this.getElementById(modelId, propSetId);
      if (propSet instanceof IfcPropertySet) {
        propSet.HasProperties.forEach(p => {
          props.push(this.resolveIfcHandle(modelId, p));
        });
      } else if (propSet instanceof IfcElementQuantity) {
        propSet.Quantities.forEach(p => {
          props.push(this.resolveIfcHandle(modelId, p));
        });
      }
    });
    return props;
  }

  /**
   * Gets children that were set using IfcRelAggregates
   * @returns list if express ids
   */
  getChildrenIdsByElementId(modelId: number, elementId: number): number[] {
    // TODO: Maybe cache something, this one seems expensive
    const childrenIds: number[] = [];
    // Getting all IfcRelAgreggates and filter out the not related to our parent
    const lines: IfcRelAggregates[] = this.getElementsOfClass<IfcRelAggregates>(
      modelId,
      IfcClass.IfcRelAgreggates,
    ).filter(ra => {
      if (ra.RelatingObject instanceof IfcObjectDefinition) {
        return ra.RelatingObject.expressID === elementId;
      } else {
        return ra.RelatingObject.value === elementId;
      }
    });
    lines.forEach(ifcRelAggr =>
      ifcRelAggr.RelatedObjects.forEach(obj => {
        if ("value" in obj) {
          childrenIds.push(obj.value);
        }
      }),
    );
    // Doing the same stuff with IfcRelContainedInSpatialStructure
    const linesContained: IfcRelContainedInSpatialStructure[] = ifcService
      .getElementsOfClass<IfcRelContainedInSpatialStructure>(modelId, IfcClass.IfcRelContainedInSpatialStructure)
      .filter(ra => {
        if (ra.RelatingStructure instanceof IfcSpatialElement) {
          return ra.RelatingStructure.expressID === elementId;
        } else {
          return ra.RelatingStructure.value === elementId;
        }
      });
    linesContained.forEach(l => {
      l.RelatedElements.forEach(o => {
        if ("value" in o) {
          childrenIds.push(o.value);
        }
      });
    });
    return childrenIds;
  }

  resolveIfcHandle<T extends object>(modelId: number, el: Handle<T> | T): T {
    if (!("value" in el)) {
      return el;
    }
    return this.getTypedElementById<T>(modelId, el.value);
  }

  getIfcIdsByClass(modelId: number, ifcClass: IfcClass): number[] {
    if (!this.ifcApi) {
      return [];
    }

    const lines: Vector<number> = this.ifcApi.GetLineIDsWithType(modelId, ifcClass);
    const vecLength: number = lines.size();

    const elements: number[] = [];
    for (let i = 0; i < vecLength; i++) {
      elements.push(lines.get(i));
    }
    return elements;
  }

  vectorToList<T>(elementsVector: Vector<T>): T[] {
    const elems: T[] = [];
    const l: number = elementsVector.size();
    for (let i = 0; i < l; i++) {
      const elem: T = elementsVector.get(i);
      elems.push(elem);
    }
    return elems;
  }
}

export const ifcService: IfcService = new IfcService();

export function decodeIFCString(ifcString: string | undefined | null): string | undefined | null {
  if (!ifcString) {
    return;
  }
  const ifcUnicodeRegEx = /\\X2\\(.*?)\\X0\\/giu;
  let resultString: string = ifcString;
  let match: RegExpExecArray | null = ifcUnicodeRegEx.exec(ifcString);
  while (match) {
    const unicodeChar: string = String.fromCharCode(parseInt(match[1], 16));
    resultString = resultString.replace(match[0], unicodeChar);
    match = ifcUnicodeRegEx.exec(ifcString);
  }
  return resultString;
}
