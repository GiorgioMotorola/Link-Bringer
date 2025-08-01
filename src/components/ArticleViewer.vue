<template>
  <div
    v-if="errorMessage"
    :class="['error-message', { 'fade-out': isFadingOut }]"
  >
    {{ errorMessage }}
  </div>
  <div v-if="inEncounter" class="overlay"></div>
  <div class="path-display">
    <span v-for="(article, index) in props.fullChain" :key="index">
      <span
        :style="{
          color: props.currentTargetIndex === index ? '#0645ad' : '#555',
        }"
      >
        {{ article.replaceAll("_", " ") }}
      </span>
      <span v-if="index < props.fullChain.length - 1" class="separator">
        &nbsp;•&nbsp;&nbsp;•&nbsp;&nbsp;•&nbsp;&nbsp;•&nbsp;&nbsp;•&nbsp;&nbsp;•&nbsp;
      </span>
    </span>
  </div>
  <div class="article" :class="{ 'blurred-content': isBlurred }">
    <div v-if="inEncounter" class="overlay"></div>
    <div class="title">{{ formattedTitle }}</div>
    <div v-if="isLoading" class="loader-overlay">
      <div class="loader-content">
        <div class="spinner"></div>
        <p>Loading article...</p>
      </div>
    </div>
    <div
      v-html="articleHtml"
      @click.prevent="handleLinkClick"
      :style="{ pointerEvents: inEncounter || isLoading ? 'none' : 'auto' }"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import { fetchWikipediaArticle } from "@/utils/wikipediaApi";

const props = defineProps({
  articleTitle: String,
  start: String,
  targets: String,
  fullChain: Array,
  currentTargetIndex: Number,
  inEncounter: Boolean,
  path: Array,
  isBlurred: Boolean,
});

const emit = defineEmits(["link-clicked"]);

const articleHtml = ref("");
const errorMessage = ref("");
const isFadingOut = ref(false);
const clearErrorTimeout = ref(null);
const hideElementTimeout = ref(null);
const isLoading = ref(false);

const formattedTitle = computed(() => props.articleTitle.replaceAll("_", " "));

function parseWikipediaUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostnameParts = urlObj.hostname.split(".");
    const langCode = hostnameParts[0];

    const pathParts = urlObj.pathname.split("/");
    const title = decodeURIComponent(pathParts[pathParts.length - 1]);

    if (
      (urlObj.hostname.endsWith("wikipedia.org") ||
        urlObj.hostname.endsWith("wiktionary.org")) &&
      pathParts[1] === "wiki"
    ) {
      return {
        langCode,
        title,
        isWikipedia: urlObj.hostname.endsWith("wikipedia.org"),
      };
    }
  } catch (e) {}
  return null;
}

const showAndClearError = (
  message,
  displayDuration = 6000,
  fadeDuration = 500
) => {
  if (clearErrorTimeout.value) {
    clearTimeout(clearErrorTimeout.value);
    clearErrorTimeout.value = null;
  }
  if (hideElementTimeout.value) {
    clearTimeout(hideElementTimeout.value);
    hideElementTimeout.value = null;
  }

  isFadingOut.value = false;
  errorMessage.value = message;

  if (message) {
    clearErrorTimeout.value = setTimeout(() => {
      isFadingOut.value = true;
      hideElementTimeout.value = setTimeout(() => {
        errorMessage.value = "";
        isFadingOut.value = false;
        hideElementTimeout.value = null;
      }, fadeDuration);
    }, displayDuration);
  }
};

const load = async () => {
  showAndClearError("");
  isLoading.value = true;

  if (!props.articleTitle || props.articleTitle.trim() === "") {
    console.warn("ArticleViewer tried to fetch an empty title.");
    showAndClearError("Invalid article title provided.", 4000);
    articleHtml.value = "";
    isLoading.value = false;
    return;
  }

  try {
    const articleContent = await fetchWikipediaArticle(props.articleTitle);

    if (articleContent === null) {
      console.error(
        `🛑 Failed to load article: ${props.articleTitle}. Keeping previous content.`
      );
      showAndClearError(
        `Failed to load "${props.articleTitle}". Please try another link.`,
        4000
      );
      return;
    }

    articleHtml.value = articleContent;
  } catch (error) {
    console.error("Error fetching Wikipedia article:", error);
    showAndClearError(
      `An unexpected error occurred while loading "${props.articleTitle}".`,
      4000
    );
    articleHtml.value = "";
  } finally {
    isLoading.value = false;
  }
};

const handleLinkClick = (event) => {
  if (props.inEncounter || isLoading.value) {
    return;
  }

  const anchor = event.target.closest("a");
  if (anchor) {
    const href = anchor.href;
    const parsedLink = parseWikipediaUrl(href);

    if (parsedLink) {
      const { langCode, title, isWikipedia } = parsedLink;

      if (!isWikipedia) {
        showAndClearError(
          `Sorry, "${title.replaceAll(
            "_",
            " "
          )}" is not a Wikipedia article and will not load properly. Please try another link.`,
          4000
        );
        return;
      }

      if (langCode === "en") {
        showAndClearError("");
        emit("link-clicked", title);
      } else {
        showAndClearError(
          `Sorry, "${title.replaceAll(
            "_",
            " "
          )}" is not an English Wikipedia article and will not load properly. Try another article.`,
          3500
        );
      }
    } else {
      showAndClearError(
        `Invalid or non-Wikipedia link clicked. Please click a valid Wikipedia article link.`,
        4000
      );
    }
  }
};

watch(() => props.articleTitle, load);
onMounted(load);
</script>

<style scoped>
* {
  font-family: Arial, Helvetica, sans-serif;
  color: rgb(54, 54, 54);
  font-weight: 400;
}
.article {
  position: relative;
  border-radius: 5px;
  padding: 1.5rem;
  background-color: #ffffff;
  max-width: 2000px;
  margin-bottom: 25rem;
  margin-top: 1.25rem;
  z-index: 10;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 20;
  background: rgba(0, 0, 0, 0);
  background: rgba(0, 0, 0, 0);
  pointer-events: all;
  cursor: not-allowed;
}

.title {
  font-size: 30px;
  font-weight: 400;
  border-bottom: 1px solid black;
}

.path {
  font-size: 20px;
  text-align: center;
  margin-bottom: 0.5rem;
  font-family: "Roboto", sans-serif;
}

.path-display {
  font-size: 15px;
  text-align: center;
  margin-bottom: 0.5rem;
  color: #555;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background-color: #ffffff;
  padding: 5px 0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  border-bottom: solid 1px black;
  z-index: 100;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  background: #e8ecee;
}

.path-display .separator {
  margin: 0 5px;
}

.error-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(184, 29, 29, 0.986);
  color: white;
  padding: 15px 30px;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 44px 15px rgba(0, 0, 0, 0.2);
  font-size: 1.1em;
  text-align: center;
  opacity: 1;
  transition: opacity 0.5s ease-out;
}

.error-message.fade-out {
  opacity: 0;
}

.blurred-content {
  filter: blur(5px);
}

.loader-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
  flex-direction: column;
}

.loader-content {
  text-align: center;
  color: #333;
  font-size: 1.2em;
}

@media screen and (max-width: 600px) {
  .article {
    padding: 0.5rem;
  }
  .title {
    font-size: 25px;
  }
  .path-display {
    font-size: 14px;
    padding: 5px 0;
  }
  .path-display .separator {
    margin: 0 2px;
  }
}
</style>
