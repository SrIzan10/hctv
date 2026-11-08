<script setup lang="ts">
import { computed } from 'vue';
import { CalendarDate, getLocalTimeZone } from '@internationalized/date';
import type { DateValue } from '@internationalized/date';
import { format } from 'date-fns';
import { CalendarIcon, X } from '@lucide/vue';
import { Button } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Input } from '~/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { cn } from '~/lib/utils';

const props = defineProps<{ value: Date | undefined }>();
const emit = defineEmits<{ (e: 'change', value: Date | undefined): void }>();

const tz = getLocalTimeZone();

const calendarValue = computed(() =>
  props.value
    ? new CalendarDate(
        props.value.getFullYear(),
        props.value.getMonth() + 1,
        props.value.getDate()
      )
    : undefined
);

function onSelect(selected: DateValue | undefined) {
  if (selected) {
    const date = selected.toDate(tz);
    const newDate = props.value ? new Date(props.value) : new Date();
    date.setHours(newDate.getHours(), newDate.getMinutes());
    emit('change', date);
  } else {
    emit('change', undefined);
  }
}

function isDateDisabled(date: DateValue) {
  return date.toDate(tz) < new Date(new Date().setHours(0, 0, 0, 0));
}

function onTimeChange(raw: string | number) {
  const text = String(raw);
  if (text) {
    const [hours, minutes] = text.split(':').map(Number);
    const newDate = props.value ? new Date(props.value) : new Date();
    newDate.setHours(hours, minutes);
    emit('change', newDate);
  }
}
</script>

<template>
  <div class="flex gap-2">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          :class="cn('flex-1 justify-start text-left font-normal text-sm', !value && 'text-muted-foreground')"
        >
          <CalendarIcon class="mr-2 h-4 w-4" />
          {{ value ? format(value, 'PPP p') : 'Pick a date & time' }}
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar
          :model-value="calendarValue"
          :is-date-disabled="isDateDisabled"
          @update:model-value="(v) => onSelect(v as DateValue | undefined)"
        />
        <div class="border-t p-3">
          <label class="text-sm font-medium">Time</label>
          <Input
            type="time"
            class="mt-1"
            :model-value="value ? format(value, 'HH:mm') : ''"
            @update:model-value="onTimeChange"
          />
        </div>
      </PopoverContent>
    </Popover>
    <Button v-if="value" variant="ghost" size="icon" @click="emit('change', undefined)">
      <X class="w-4 h-4" />
    </Button>
  </div>
</template>
