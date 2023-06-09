<script lang="ts">
  import { TreeView, Grid, Row, Column } from "carbon-components-svelte";
  import { FileUploaderDropContainer } from "carbon-components-svelte";

  import loadIfc, { loadObjectData, objectDataToTreeNodes } from "./ifc-load";
  import type { TreeNode } from "carbon-components-svelte/types/TreeView/TreeView.svelte";
  import { Loading } from "carbon-components-svelte";

  // Sets up the IFC loading
  let isFileLoaded = false;
  let isLoading = false;
  let modelId: number | undefined;
  let objectsTree: TreeNode[] | undefined;

  let currentlySelectedObjectData: TreeNode[] | undefined;

  let activeId: string = "";
  let selectedIds: string[] = [];
  let selectedName: string = "";

  const handleFiles = (files: File[]): void => {
    if (files.length > 0) {
      isLoading = true;
      handleIfcLoading(files[0]);
    }
  };

  const handleChange = (event: CustomEvent): void => {
    console.log(event);
    const files = event.detail;
    handleFiles(files);
  };

  const onConstructionElementSelect = (node: TreeNode): void => {
    const { id: expressId, text } = node;
    selectedName = text;
    const objData = loadObjectData(modelId, Number(expressId));
    currentlySelectedObjectData = objectDataToTreeNodes(objData);
  };

  const handleIfcLoading = async (file: File): Promise<void> => {
    const [objTree, mdId] = await loadIfc(file);
    objectsTree = objTree;
    modelId = mdId;
    isFileLoaded = true;
    isLoading = false;
    console.log(objectsTree); // this also allows to view the IFC in the console
  };
</script>

<div class="page-wrapper">
  {#if !isFileLoaded}
    <FileUploaderDropContainer
      labelText="Click or drag and drop to upload IFC file"
      validateFiles={(files) => {
        return files.filter((file) => file.name.endsWith(".ifc"));
      }}
      on:change={handleChange}
    >
    </FileUploaderDropContainer>
  {:else if isLoading}
    <Loading />
  {:else}
    <Grid>
      <Row>
        <Column class="left-side">
          <TreeView
            children={objectsTree}
            labelText="File hierarchy"
            bind:activeId
            bind:selectedIds
            on:select={({ detail }) => onConstructionElementSelect(detail)}
          />
        </Column>
        <Column class="right-side">
          <TreeView
            children={currentlySelectedObjectData}
            labelText={selectedName}
          />
        </Column>
      </Row>
    </Grid>
  {/if}
</div>

<style>
  .page-wrapper {
    margin: 2rem;
    position: relative;
    overflow-y: auto;
  }
  :global(label.bx--file-browse-btn) {
    max-width: 100%;
    color: rgb(140, 140, 140);
  }
  :global(label.bx--file-browse-btn):hover {
    outline: 0;
    text-decoration: none;
    align-items: center;
  }
  :global(div.bx--file__drop-container) {
    text-align: center;
    display: block;
    border-radius: 12px;
    transition: 300ms cubic-bezier(0.2, 0, 0.38, 0.9);
    border: 1px #8d8d8d;
    border-style: dashed;
  }
  :global(div.bx--file__drop-container):hover {
    background-color: lavender;
  }
  :global(div.bx--grid) {
    margin-left: 0;
    margin-right: 0;
    padding-left: 1rem;
    padding-right: 1rem;
  }
  :global(div.bx--col) {
    max-width: 50%;
    overflow: auto;
  }
</style>
