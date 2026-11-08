<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import Preview from './Preview.vue';
import Write from './Write.vue';

const defaultText = `Build by @mxkaske, _powered by_ @shadcn **ui**.\n\nSupports raw <code>html</code>.`;

const textValue = ref(defaultText);
</script>

<template>
  <Tabs default-value="write" class="w-full">
    <TabsList>
      <TabsTrigger value="write">Write</TabsTrigger>
      <TabsTrigger value="preview">Preview</TabsTrigger>
    </TabsList>
    <TabsContent value="write">
      <Write :text-value="textValue" @set-text-value="(v: string) => (textValue = v)" />
    </TabsContent>
    <TabsContent value="preview">
      <Preview :text-value="textValue" />
    </TabsContent>
  </Tabs>
</template>
