<script lang="ts">
  import { JsonView } from "@zerodevx/svelte-json-view";
  import { Dropzone, Spinner } from 'flowbite-svelte'
  import loadIfc from "./ifc-load";

  // Sets up the IFC loading
  let isFileLoaded = false;
  let json: Record<string, any> = {};
  let isLoading = false;

  const dropHandle = (event) => { 
    event.preventDefault(); 
    const files = event.dataTransfer.files; 
    if (files.length > 0) {
      isLoading = true;
      handleIfcLoading(files[0])
    }
  }

  const handleChange = (event) => {
    const files = event.target.files; 
    if (files.length > 0) {
      isLoading = true;
      handleIfcLoading(files[0])
    }
  }

  const handleIfcLoading = async (file: File): Promise<void> => {
    json = await loadIfc(file);
    isLoading = false;
    isFileLoaded = true;
    console.log(json) // this also allows to view the IFC in the console
  }
</script>

{#if !isFileLoaded}
  <Dropzone id='dropzone' 
  on:drop={dropHandle} 
  on:dragover={(event) => { event.preventDefault() }}
  on:change={handleChange}
  >
  <svg aria-hidden="true" class="mb-3 w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
  <p class="mb-2 text-sm text-gray-500 dark:text-gray-400"><span class="font-semibold">Click to upload IFC file</span> or drag and drop</p>
</Dropzone>
{:else if isLoading} 
  <Spinner />
{:else}
  <JsonView {json} depth={1} />
{/if}
