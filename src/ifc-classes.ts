import {
  IFCBUILDING,
  IFCBUILDINGSTOREY,
  IFCOBJECTDEFINITION,
  IFCRELDEFINESBYOBJECT,
  IFCRELDEFINESBYPROPERTIES,
  IFCSITE,
  IFCSPATIALZONE,
  IFCRELNESTS,
  IFCRELAGGREGATES,
  IFCGRID,
  IFCRELCONTAINEDINSPATIALSTRUCTURE,
  IFCSTYLEDITEM,
  IFCSURFACESTYLE,
  IFCREFERENCE,
  IFCSPACETYPE,
  IFCRELDEFINESBYTYPE,
} from "web-ifc";

export enum IfcClass {
  IfcSpatialZone = IFCSPATIALZONE,
  IfcBuildingStorey = IFCBUILDINGSTOREY,
  IfcRelDefinesByProperties = IFCRELDEFINESBYPROPERTIES,
  IfcRelDefinesByObject = IFCRELDEFINESBYOBJECT,
  IfcSite = IFCSITE,
  IfcBuilding = IFCBUILDING,
  IfcObjectDefinition = IFCOBJECTDEFINITION,
  IfcRelNests = IFCRELNESTS,
  IfcRelAgreggates = IFCRELAGGREGATES,
  IfcRelContainedInSpatialStructure = IFCRELCONTAINEDINSPATIALSTRUCTURE,
  IfcGrid = IFCGRID,
  IfcStyledItem = IFCSTYLEDITEM,
  IfcSurfaceStyle = IFCSURFACESTYLE,
  IfcReference = IFCREFERENCE,
  IfcSpaceType = IFCSPACETYPE,
  IfcRelDefinesByType = IFCRELDEFINESBYTYPE,
}
