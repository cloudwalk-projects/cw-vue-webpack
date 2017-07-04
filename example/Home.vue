<template>
  <div>
    <div>this is Header</div>
    <div v-bind="model1">{{text}}</div>
  </div>
</template>
<style>
#header {
  width: 100px;
}
</style>
<script>
import header from './includes/header.vue';

export default {
  data() {
    return {
      msg: 'hello vue'
    }
  },
  components: {}}
</script>

