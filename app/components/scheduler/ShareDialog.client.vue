<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import QRCode from 'qrcode';
import { Copy, Check, Mail } from '@lucide/vue';

const props = defineProps<{
  open: boolean;
  url: string;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
});

const qrCodeDataUrl = ref('');
const copied = ref(false);

watch(
  () => props.open,
  async (newOpen) => {
    if (newOpen && props.url) {
      try {
        qrCodeDataUrl.value = await QRCode.toDataURL(props.url, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
        });
      } catch (err) {
        console.error(err);
      }
    }
  },
);

function copyToClipboard() {
  navigator.clipboard.writeText(props.url);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

function shareToSocial(platform: string) {
  let shareUrl = '';
  const text = 'Xem thời khóa biểu của tôi!';
  const url = encodeURIComponent(props.url);
  const title = encodeURIComponent(text);

  switch (platform) {
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      break;
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      break;
    case 'email':
      shareUrl = `mailto:?subject=${title}&body=${url}`;
      break;
  }

  if (shareUrl) {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle
          class="text-xl font-bold bg-linear-to-r from-primary to-purple-600 bg-clip-text text-transparent"
        >
          Chia sẻ thời khóa biểu
        </DialogTitle>
        <DialogDescription>
          Mời bạn bè xem thời khóa biểu của bạn hoặc quét mã QR để truy cập nhanh.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-6 py-4">
        <!-- Main Link Section -->
        <div class="space-y-4">
          <Label>Liên kết chia sẻ</Label>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <Input :model-value="url" readonly class="pr-10 bg-muted/50 font-mono text-sm" />
            </div>
            <Button
              size="icon"
              variant="outline"
              :class="{ 'text-green-500 border-green-500': copied }"
              @click="copyToClipboard"
            >
              <Check v-if="copied" class="size-4" />
              <Copy v-else class="size-4" />
            </Button>
          </div>
        </div>

        <!-- Two Columns: QR Code and Social Actions -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- QR Code Column -->
          <div
            class="flex flex-col items-center justify-center p-4 bg-white rounded-xl border shadow-sm dark:bg-card"
          >
            <div v-if="qrCodeDataUrl" class="relative group">
              <img
                :src="qrCodeDataUrl"
                alt="QR Code"
                class="size-32 md:size-40 object-contain rounded-lg"
              />
              <div
                class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity rounded-lg cursor-pointer"
                @click="copyToClipboard"
              >
                <span class="text-white text-xs font-medium">Sao chép Link</span>
              </div>
            </div>
            <div
              v-else
              class="size-32 flex items-center justify-center bg-gray-100 rounded-lg animate-pulse"
            >
              <span class="text-xs text-muted-foreground">Đang tạo...</span>
            </div>
            <p class="mt-2 text-xs text-muted-foreground font-medium">Quét để xem</p>
          </div>

          <!-- Social Share Column -->
          <div class="flex flex-col gap-3 justify-center">
            <Label class="text-center md:text-left">Chia sẻ qua</Label>
            <div class="grid grid-cols-2 gap-3">
              <Button variant="outline" class="w-full flex gap-2" @click="shareToSocial('email')">
                <Mail class="size-4 text-gray-600" />
                <span class="text-xs">Email</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter class="sm:justify-start">
        <div class="text-[10px] text-muted-foreground w-full text-center">
          Liên kết sẽ tự động hết hạn sau 30 ngày nếu không có người truy cập.
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
