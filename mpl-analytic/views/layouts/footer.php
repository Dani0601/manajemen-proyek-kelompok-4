</main>
    </div>
</div>

<script
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
></script>

<script
    src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/js/main.js"
></script>

<?php if (!empty($pageJs)): ?>
    <script
        src="<?= htmlspecialchars(ASSET_BASE, ENT_QUOTES, 'UTF-8') ?>/js/pages/<?= htmlspecialchars($pageJs, ENT_QUOTES, 'UTF-8') ?>"
    ></script>
<?php endif; ?>

</body>
</html>