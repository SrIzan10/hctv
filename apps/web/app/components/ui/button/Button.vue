<script setup lang="ts">
import type { PrimitiveProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { ButtonVariants } from "."
import { cn } from "cn"
import { LoaderCircle } from "@lucide/vue"
import { Primitive } from "reka-ui"
import { buttonVariants } from "."

interface Props extends PrimitiveProps {
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
  class?: HTMLAttributes["class"]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: "button",
})
</script>

<template>
  <Primitive
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :disabled="loading || undefined"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <LoaderCircle v-if="loading" class="size-4 animate-spin" />
    <slot />
  </Primitive>
</template>
